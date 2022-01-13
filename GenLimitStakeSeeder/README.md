# GenLimitStakeSeeder

## Generate the specific limit stake seeder of the giving currency.
<br/>

# Prerequisites
* Node.js - ^14.16.1
* Create a *csv* folder
* Npm install

# Usage
1. Make sure all the data in 單桌範本 and 多桌範本 are all correct, then download the file of certain currency in csv format.

2. Rename the csv filename by a leading m or s, stands for 多桌 and 單桌 respectively, following by the currency code, e.g., mTWD represents 新台幣多桌

3. Make sure you download and rename both m and s type, and move the csv file into *csv* folder.

4. Run the command with currency codes you need, for example:
```
node genLimitStakeSeeder.js TWD CNY
```
Or you call run all the currencies without any code
```
node genLimitStakeSeeder.js
```
5. The generate seeder code will be placed in *result* folder named as currency code