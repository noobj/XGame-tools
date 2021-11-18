const path = require('path');
const csv = require('csvtojson');
const fs = require('fs');


if (!fs.existsSync('result')){
    fs.mkdirSync('result');
}

const myArgs = process.argv.slice(2);
if (!myArgs[0]) {
    console.log('need to assign a currency, e.g. TWD');
    return 1;
}

const currency = myArgs[0];
const numberPattern = /\d+/g;
const writeStream = fs.createWriteStream(path.resolve(`result/${currency}`));

writeStream.write(`DB::table('BaccaratLimitStakeSample')->insert([\n`);

csv()
.fromFile(path.resolve(`csv/s${currency}.csv`))
.then((jsonText)=>{
    jsonText.map((v) => {
        let str = '[';
        Object.keys(v).map(key => {
            const match = key.match(numberPattern);
            // skip the columns with float number name
            if (match != null && match.length > 1) return;

            // 賠率限額要用浮點數
            const matchMaxMin = key.match(/Max|Min/g);
            if (match != null) str += `\'${key}\' => \'${parseFloat(v[key]).toFixed(2)}\', `
            else str += `\'${key}\' => \'${v[key]}\', `
        });
        str += `\'UpdateTime\' => \'2021-11-17 14:17:03\'],`;
        writeStream.write(str);
    });
})
.then(() => {
    writeStream.write('\n]);\n\n\t\t// MultipleLimitStakeSample\n');

    // Multiple
    writeStream.write(`DB::table('MultipleLimitStakeSample')->insert([`);

    csv()
    .fromFile(path.resolve(`csv/m${currency}.csv`))
    .then((jsonText)=>{
        jsonText.map((v) => {
            let str = '[';
            Object.keys(v).map(key => {
                const match = key.match(numberPattern);
                // skip the columns with float number name
                if (match != null && match.length > 1) return;

                // 賠率限額要用浮點數
                const matchMaxMin = key.match(/Max|Min/g);
                if (match != null) str += `\'${key}\' => \'${parseFloat(v[key]).toFixed(2)}\', `
                else str += `\'${key}\' => \'${v[key]}\', `
            });
            str += `\'UpdateTime\' => \'2021-11-17 14:17:03\'],`;

            writeStream.write(str);
        });

        writeStream.write(`\n]);`);
        writeStream.end();
    })

});
