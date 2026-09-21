const fs = require('fs');
const path = require('path');

const dir = './app/(tabs)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== '_layout.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<ScrollView')) {
    // Replace tags
    content = content.replace(/<ScrollView/g, '<CustomScrollView');
    content = content.replace(/<\/ScrollView>/g, '</CustomScrollView>');
    
    // Add import if not exists
    if (!content.includes('CustomScrollView')) {
      content = content.replace(
        "import React", 
        "import React"
      ); // Just to find the top
      
      const importStatement = "\nimport { CustomScrollView } from '../../components/CustomScrollView';";
      
      // Inject after react-native imports
      content = content.replace(/import \{[^}]+\} from ['"]react-native['"];/, match => match + importStatement);
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Updated', file);
  }
});
