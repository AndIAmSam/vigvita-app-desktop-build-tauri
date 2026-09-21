const fs = require('fs');
const path = require('path');

const dir = './app/(tabs)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== '_layout.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<CustomScrollView') && !content.includes('CustomScrollView\'')) {
    // Inject import statement just below the first import
    content = content.replace(/import React[^;]*;/, match => match + "\nimport { CustomScrollView } from '../../components/CustomScrollView';");
    fs.writeFileSync(filePath, content);
    console.log('Fixed import in', file);
  }
});
