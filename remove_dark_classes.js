const fs = require('fs');
const path = require('path');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Regex to match and remove Tailwind dark: classes (e.g., dark:bg-navy, dark:text-white, dark:border-white/10, dark:bg-[#0a1128])
      const darkRegex = /dark:([a-zA-Z0-9-\/\[\]#]+)/g;
      
      const newContent = content.replace(darkRegex, '').replace(/ +/g, ' '); // Clean up extra spaces
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

console.log("Removing all dark mode classes...");
processDirectory(path.join(__dirname, 'app'));
processDirectory(path.join(__dirname, 'components'));
console.log("Done.");
