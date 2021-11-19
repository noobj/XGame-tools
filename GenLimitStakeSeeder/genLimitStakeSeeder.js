const path = require('path');
const csv = require('csvtojson');
const fs = require('fs');
const { renderFile } = require('template-file');

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

const myArgs = process.argv.slice(2);
if (!myArgs[0]) {
    console.log('need to assign a currency, e.g. TWD');
    return 1;
}

const currency = myArgs[0];
const numberPattern = /\d+/g;
const writeStream = fs.createWriteStream(path.resolve(`result/${currency}`));
const data = {
    currency: {
        allUpper: currency,
        camel: currency.toLowerCase().capitalize()
    }
};

csv()
.fromFile(path.resolve(`csv/s${currency}.csv`))
.then((jsonText)=>{
    let str;
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
    return csv()
    .fromFile(path.resolve(`csv/m${currency}.csv`))
    .then((jsonText)=>{
        let str;
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
