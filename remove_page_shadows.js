const fs = require('fs');
const path = require('path');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') && !fullPath.includes('login')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Specifically target the shadow-2xl on the main page wrapper
      // by looking for "shadow-2xl relative" or "shadow-2xl relative overflow-hidden"
      // or just removing shadow-2xl if it's accompanied by min-h-screen
      if (content.includes('min-h-screen') && content.includes('shadow-2xl')) {
        // Replace shadow-2xl with empty string if it's on the main wrapper
        // The main wrapper class strings usually look like "w-full max-w-7xl mx-auto min-h-screen bg-background pb-20 shadow-2xl relative"
        content = content.replace(/shadow-2xl\s/g, '');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Removed shadow-2xl from wrapper in ${fullPath}`);
      }
    }
  }
}

console.log("Removing shadow-2xl from page wrappers...");
processDirectory(path.join(__dirname, 'app'));
console.log("Done.");
