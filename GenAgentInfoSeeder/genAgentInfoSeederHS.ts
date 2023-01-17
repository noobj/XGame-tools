import fs from 'fs';
import { google, sheets_v4 } from 'googleapis';
import readline from 'readline';
import dotenv from 'dotenv';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { GaxiosResponse } from 'gaxios';
dotenv.config();

const TOKEN_PATH = 'token.json';
const HS_SHEET_ID = process.env.HS_SHEET_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

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
    const res = await sheets.spreadsheets.values
        .get({
            spreadsheetId: HS_SHEET_ID,
            range: '表單回應 1'
        })
        .then((rawData) => rawDataToObject(rawData))
        .catch(async (err) => {
            console.log('fetch spread sheets error, renew the token...');
            console.log(err);
            const token = await getNewToken(auth);
            auth.setCredentials(token);
            await fetchData(auth);
            process.exit(0);
        });

    let str = '';
    res.map((v) => {
        if (!v.account) return;

        str += `'${v.account}' => [\n`;
        str += `'im' => '${v.im}',\n`;
        str += `'imGroup' => '${v.imGName}',\n`;
        str += `'testingURL' => '${v.tUrl}',\n`;
        str += `'testingAccount' => '${v.tAccount}',\n`;
        str += `'testingPassword' => '${v.tPass}',\n`;
        str += '],\n';
    })

    console.log(str);
    return;
}

function rawDataToObject(
    rawData: GaxiosResponse<sheets_v4.Schema$ValueRange>
): Record<string, string>[] {
    const data = rawData.data.values;

    if (data == null || data == undefined) return [];

    const keys = [
        'notImportant',
        'notImportant',
        'account',
        'notImportant',
        'notImportant',
        'notImportant',
        'im',
        'imGName',
        'tUrl',
        'tAccount',
        'notImportant',
        'tPass',
        'notImportant'
    ] as const;
    const result = [] as Record<typeof keys[number], string>[];
    for (let i = 1; i < data.length; i++) {
        result[i] = {} as Record<typeof keys[number], string>;
        for (let j = 0; j < data[i].length; j++) {
            result[i][keys[j]] = data[i][j];
        }
    }

    return result;
}
