const lineReader = require('line-reader');
count = 0;

lineReader.eachLine('./text.txt', function(line) {

    // Delete first two lines
    if (count < 2) {
        count++;
        return;
    }

    line = line.replace(/\s/g, '');

    // console.log(line);

    line = line.split("|");

    line = line.map(function($str) {
        if ($str == '' || $str == '[NULL]') return 'NULL';

        return $str;
    })
    console.log(`['GameTypes' => 'Roulette', 'SpotId' => ${line[3]}, 'Odds' => ${line[4]}, 'SpotEnglishName' => '${line[6]}', 'SpotChineseName' => '${line[7]}', 'InstantPotChinese' => '${line[8]}', 'InstantPotCardType' => NULL, 'InstantPotOrder' => ${line[10]}],`);
});