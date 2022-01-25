import * as path from 'path';
import fs from 'fs';
import { renderFile } from 'template-file';
import { google, sheets_v4 } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { GaxiosResponse } from 'gaxios';
dotenv.config();

const TOKEN_PATH = 'token.json';
const SINGLE_TABLE_SHEET_ID = process.env.SINGLE_TABLE_SHEET_ID;
const MULTIPLE_TABLE_SHEET_ID = process.env.MULTIPLE_TABLE_SHEET_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

declare global {
    interface String {
        capitalize(): string;
    }
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

if (!fs.existsSync('result')) {
    fs.mkdirSync('result');
}

enum SingleOrMultiple {
    Single,
    Multiple
}

const numberPattern = /\d+/g;
const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const redirectUrl = 'urn:ietf:wg:oauth:2.0:oob';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

authorize();

function authorize() {
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
    fs.readFile(TOKEN_PATH, async (err, token: Buffer | Credentials) => {
        if (err) token = await getNewToken(oAuth2Client);
        else token = JSON.parse(token.toString()) as Credentials;
        oAuth2Client.setCredentials(token);
        await fetchData(oAuth2Client);
        process.exit(0);
    });
}

function getNewToken(auth: OAuth2Client) {
    const url = auth.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    console.log(url);

    return new Promise((resolve) => {
        rl.question('Enter the code? ', (code) => {
            rl.close();
            return auth
                .getToken(code)
                .then((token) => {
                    fs.writeFile(TOKEN_PATH, JSON.stringify(token.tokens), (err) => {
                        if (err) console.error(err);
                        console.log('Token stored to', TOKEN_PATH);
                        resolve(token.tokens);
                    });
                })
                .catch((err) => {
                    console.log(err);
                    console.log('Get token error');
                    process.exit(1);
                });
        });
    });
}

async function fetchData(auth: OAuth2Client) {
    const sheets = google.sheets({ version: 'v4', auth });
    // Find the newest ahorro backup file
    const res = await sheets.spreadsheets
        .get({
            spreadsheetId: SINGLE_TABLE_SHEET_ID
        })
        .catch(async (err) => {
            console.log('fetch spread sheets error, renew the token...');
            console.log(err);
            const token = await getNewToken(auth);
            auth.setCredentials(token);
            await fetchData(auth);
            process.exit(0);
        });

    return Promise.all(
        res.data.sheets.map((sheet) => {
            const currency = sheet.properties.title;
            console.log(`Converting currency ${currency}`);
            const writeStream = fs.createWriteStream(
                path.resolve(
                    `result/Seed${currency
                        .toLowerCase()
                        .capitalize()}LimitStakeSample.php`
                )
            );
            const data = {
                singleData: '',
                multipleData: '',
                currency: {
                    allUpper: currency,
                    camel: currency.toLowerCase().capitalize()
                }
            };

            return Promise.all([
                fetchSheetToString(sheets, currency, SingleOrMultiple.Single),
                fetchSheetToString(sheets, currency, SingleOrMultiple.Multiple)
            ]).then(async (values) => {
                data.singleData = values[0];
                data.multipleData = values[1];
                const content = await renderFile(
                    path.resolve(`seeder_template.txt`),
                    data
                );
                writeStream.write(content);
            });
        })
    ).then(() => console.log('done'));
}

async function fetchSheetToString(
    sheets: sheets_v4.Sheets,
    currency: string,
    singleOrMultiple: SingleOrMultiple
): Promise<string> {
    const spreadsheetId =
        singleOrMultiple === SingleOrMultiple.Single
            ? SINGLE_TABLE_SHEET_ID
            : MULTIPLE_TABLE_SHEET_ID;
    return sheets.spreadsheets.values
        .get({
            spreadsheetId,
            range: currency.toUpperCase()
        })
        .then((rawData) => rawDataToObject(rawData))
        .then((fetchedData) => {
            return dataObjectToString(fetchedData);
        })
        .catch((err) => {
            console.log('fetch sheet error...');
            console.log(err);
            process.exit(1);
        });
}

function rawDataToObject(
    rawData: GaxiosResponse<sheets_v4.Schema$ValueRange>
): Record<string, string>[] {
    const data = rawData.data.values;
    const keys = [...data[0].values()] as const;
    const result = [] as Record<typeof keys[number], string>[];
    for (let i = 1; i < data.length; i++) {
        result[i] = {};
        for (let j = 0; j < data[i].length; j++) {
            result[i][data[0][j]] = data[i][j];
        }
    }

    return result;
}

function dataObjectToString(objData: Record<string, string>[]) {
    let str = '';
    objData.map((v) => {
        str += '[';
        Object.keys(v).map((key) => {
            const match = key.match(numberPattern);
            // skip the columns with float number name
            if (match != null && match.length > 1) return;

            // 賠率限額要用浮點數
            const matchMaxMin = key.match(/Max|Min/g);
            if (matchMaxMin != null)
                str += `\'${key}\' => \'${parseFloat(v[key]).toFixed(2)}\', `;
            else str += `\'${key}\' => \'${v[key]}\', `;
        });

        str += `\'UpdateTime\' => \'2021-11-17 14:17:03\'],`;
    });

    return str;
}
