const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js') && !fullPath.includes('login')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('max-w-md mx-auto')) {
        content = content.replace(/max-w-md mx-auto/g, 'w-full max-w-7xl mx-auto');
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'app'));
replaceInDir(path.join(__dirname, 'components'));
