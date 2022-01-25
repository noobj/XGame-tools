# GenLimitStakeSeeder

## Generate the limit stake seeders from Google Sheets.
<br/>

# Prerequisites
* Node.js - ^14.16.1
* Npm install

# Usage
1. create .env file by copying the .env.example

2. fill the variable in .env file

*sheet id can be found at url*
![image](https://user-images.githubusercontent.com/3764150/150907255-083c5cd3-7021-41b5-a785-1d96dedcfb56.png)

*client id and secret are in the Google console*

3. compile the genLimitStakeSeeder.ts

*or you can run with ts-node directly.*
```ts-node genLimitStakeSeeder.ts```

4. run the command
```
node dist/genLimitStakeSeeder.js
```
5. The generated seeders will be placed in *result* folder
