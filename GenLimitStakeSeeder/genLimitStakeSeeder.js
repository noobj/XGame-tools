const path = require('path');
const csv = require('csvtojson');
const fs = require('fs');
const { renderFile } = require('template-file');
const { google } = require('googleapis');
const readline = require('readline');

const TOKEN_PATH = 'token.json';
const SINGLE_TABLE_SHEET_ID = '1F8kZiO-VUKjRrnL_VNQnbx8QNdnltieIfiomuBDtef8';
const MULTIPLE_TABLE_SHEET_ID = '14RSYTXs1YdFoI-oc-zCARwOk-JDvC3x9VrM_Ny-oQE0';

// helper function for capitalizing the string
Object.defineProperty(String.prototype, 'capitalize', {
    value: function() {
      return this.charAt(0).toUpperCase() + this.slice(1);
    },
    enumerable: false
});

if (!fs.existsSync('result')){
    fs.mkdirSync('result');
}

let currencies = [];

const myArgs = process.argv.slice(2);
if (!myArgs[0]) {
    console.log('Converting all currencies...');
    currencies = ['AUD', 'CNY', 'HKD', 'IDR', 'INR', 'JPY', 'KRW', 'MYR', 'NZD', 'PHP', 'SGD', 'THB', 'TWD', 'USD', 'USDT', 'VND'];
} else {
    currencies = myArgs.map((args) => args.toUpperCase());
    console.log(`Converting ${currencies}...`);
}

const numberPattern = /\d+/g;
const clientId = '922193239148-29j7iiiq8dfm9vtph2iqgup1hc422fdp.apps.googleusercontent.com';
const clientSecret = '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';
const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const redirectUrl = "urn:ietf:wg:oauth:2.0:oob";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

authorize();

function authorize() {
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
    fs.readFile(TOKEN_PATH, async (err, token) => {
        if (err) token = await getNewToken(oAuth2Client);
        else token = JSON.parse(token);
        oAuth2Client.setCredentials(token);
        await fetchData(oAuth2Client);
        process.exit(0);
    });
}

async function getNewToken(auth) {
    const url = auth.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });
    console.log(url);

    return await new Promise((resolve) => {
        rl.question('Enter the code? ', (code) => {
            rl.close();
            auth.getToken(code, (err, token) => {
                if (err) throw 'Error while trying to retrieve access token', err;

                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                    resolve(token);
                });
            });
        });
    });
}

async function fetchData(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    // Find the newest ahorro backup file
    let res = await sheets.spreadsheets.get({
        spreadsheetId: SINGLE_TABLE_SHEET_ID
    }).catch(err => {
        console.log(err);
    });

    return Promise.all(
        res.data.sheets.map(async (sheet) => {
            const currency = sheet.properties.title;
            console.log(`Converting currency ${currency}`);
            const writeStream = fs.createWriteStream(path.resolve(`result/Seed${currency.toLowerCase().capitalize()}LimitStakeSample.php`));
            const data = {
                currency: {
                    allUpper: currency,
                    camel: currency.toLowerCase().capitalize()
                }
            };

            return sheets.spreadsheets.values.get({
                spreadsheetId: SINGLE_TABLE_SHEET_ID,
                range: sheet.properties.title
            })
            .then((rawData) => {
                const data = rawData.data.values;
                const result = [];
                for (let i = 1; i < data.length; i++) {
                    result[i] = {};
                    for (let j = 0; j < data[i].length; j++) {
                        result[i][data[0][j]] = data[i][j];
                    }
                }

                return result;
            })
            .then((jsonText)=>{
                let str = '';
                jsonText.map((v) => {
                    str += '[';
                    Object.keys(v).map(key => {
                        const match = key.match(numberPattern);
                        // skip the columns with float number name
                        if (match != null && match.length > 1) return;

                        // 賠率限額要用浮點數
                        const matchMaxMin = key.match(/Max|Min/g);
                        if (matchMaxMin != null) str += `\'${key}\' => \'${parseFloat(v[key]).toFixed(2)}\', `
                        else str += `\'${key}\' => \'${v[key]}\', `
                    });

                    str += `\'UpdateTime\' => \'2021-11-17 14:17:03\'],`;
                });

                data.singleData = str;
            })
            .then(() => {
                return sheets.spreadsheets.values.get({
                    spreadsheetId: MULTIPLE_TABLE_SHEET_ID,
                    range: sheet.properties.title
                })
                .then((rawData) => {
                    const data = rawData.data.values;
                    const result = [];
                    for (let i = 1; i < data.length; i++) {
                        result[i] = {};
                        for (let j = 0; j < data[i].length; j++) {
                            result[i][data[0][j]] = data[i][j];
                        }
                    }

                    return result;
                })
                .then((jsonText)=>{
                    let str = '';
                    jsonText.map((v) => {
                        str += '[';
                        Object.keys(v).map(key => {
                            const match = key.match(numberPattern);
                            // skip the columns with float number name
                            if (match != null && match.length > 1) return;

                            // 賠率限額要用浮點數
                            const matchMaxMin = key.match(/Max|Min/g);
                            if (matchMaxMin != null) str += `\'${key}\' => \'${parseFloat(v[key]).toFixed(2)}\', `
                            else str += `\'${key}\' => \'${v[key]}\', `
                        });

                        str += `\'UpdateTime\' => \'2021-11-17 14:17:03\'],`;
                    });

                    data.multipleData = str;
                })
            })
            .then(async () => {
                const content = await renderFile(path.resolve(`seeder_template.txt`), data);
                writeStream.write(content);
            })
        })
    ).then(() => console.log('done'));
}

