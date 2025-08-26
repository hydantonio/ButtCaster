
const fs = require('fs');
const path = require('path');
const stateFile = path.join(__dirname, 'state.json');
function load(){
  try{ return JSON.parse(fs.readFileSync(stateFile,'utf8')); }catch(e){ return {}; }
}
function save(obj){
  try{ fs.writeFileSync(stateFile, JSON.stringify(obj, null, 2)); }catch(e){}
}
module.exports = { load, save, stateFile };
