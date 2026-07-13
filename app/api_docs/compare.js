const fs = require('fs');
const yaml = require('yaml');

const v13Content = fs.readFileSync('/Users/samflogar/Dev/vigvita-app/api_docs/api-v13.yml', 'utf8');
const desktopV14Content = fs.readFileSync('/Users/samflogar/Dev/vigvita-app/api_docs/api-desktop-v14.yaml', 'utf8');
const generalV14Content = fs.readFileSync('/Users/samflogar/Dev/vigvita-app/api_docs/api-general-v14.yaml', 'utf8');

const v13 = yaml.parse(v13Content);
const desktopV14 = yaml.parse(desktopV14Content);
const generalV14 = yaml.parse(generalV14Content);

const output = [];

output.push("=== ENDPOINTS IN DESKTOP V14 ===");
for (const path in desktopV14.paths) {
    for (const method in desktopV14.paths[path]) {
        output.push(`\nPath: ${path} [${method.toUpperCase()}]`);
        
        const v14Endpoint = desktopV14.paths[path][method];
        const v13Endpoint = v13.paths[path]?.[method];
        
        if (!v13Endpoint) {
            output.push("  - NEW ENDPOINT in Desktop v14 (did not exist in v13).");
            continue;
        }

        // Compare Summary
        if (v14Endpoint.summary !== v13Endpoint.summary) {
            output.push(`  - Summary changed: '${v13Endpoint.summary}' -> '${v14Endpoint.summary}'`);
        }

        // Compare Parameters
        const v14Params = v14Endpoint.parameters || [];
        const v13Params = v13Endpoint.parameters || [];
        
        const v14ParamMap = new Map(v14Params.map(p => [p.name + ':' + p.in, p]));
        const v13ParamMap = new Map(v13Params.map(p => [p.name + ':' + p.in, p]));
        
        for (const [key, p14] of v14ParamMap.entries()) {
            if (!v13ParamMap.has(key)) {
                output.push(`  - NEW Parameter: ${p14.name} (in ${p14.in}, required: ${p14.required})`);
            } else {
                const p13 = v13ParamMap.get(key);
                if (p14.required !== p13.required) {
                    output.push(`  - Parameter '${p14.name}' required changed: ${p13.required} -> ${p14.required}`);
                }
                const p14SchemaType = p14.schema?.type;
                const p13SchemaType = p13.schema?.type;
                if (p14SchemaType !== p13SchemaType) {
                    output.push(`  - Parameter '${p14.name}' type changed: ${p13SchemaType} -> ${p14SchemaType}`);
                }
            }
        }
        for (const [key, p13] of v13ParamMap.entries()) {
            if (!v14ParamMap.has(key)) {
                output.push(`  - REMOVED Parameter: ${p13.name} (in ${p13.in})`);
            }
        }

        // Compare Request Body (very basic check)
        const getRequestBodyRef = (endpoint) => {
            const content = endpoint.requestBody?.content;
            if (!content) return null;
            const appJson = content['application/json'];
            if (!appJson) return null;
            return appJson.schema?.$ref || appJson.schema?.type || JSON.stringify(appJson.schema);
        };
        const reqV14 = getRequestBodyRef(v14Endpoint);
        const reqV13 = getRequestBodyRef(v13Endpoint);
        if (reqV14 !== reqV13) {
            output.push(`  - Request Body schema ref changed: ${reqV13} -> ${reqV14}`);
        }

        // Compare Responses (very basic check)
        const getResponseRef = (endpoint, code) => {
            const content = endpoint.responses?.[code]?.content;
            if (!content) return null;
            const appJson = content['application/json'];
            if (!appJson) return null;
            return appJson.schema?.$ref || appJson.schema?.type || JSON.stringify(appJson.schema);
        };
        const codes = new Set([...Object.keys(v14Endpoint.responses || {}), ...Object.keys(v13Endpoint.responses || {})]);
        for (const code of codes) {
            const resV14 = getResponseRef(v14Endpoint, code);
            const resV13 = getResponseRef(v13Endpoint, code);
            if (resV14 !== resV13 && (resV14 || resV13)) {
                output.push(`  - Response ${code} schema ref changed: ${resV13} -> ${resV14}`);
            }
        }
    }
}

// Also let's check for components schema changes
output.push("\n=== COMPONENT SCHEMA CHANGES (Used in Desktop) ===");
const desktopSchemas = desktopV14.components?.schemas || {};
const v13Schemas = v13.components?.schemas || {};

for (const [name, schema14] of Object.entries(desktopSchemas)) {
    const schema13 = v13Schemas[name];
    if (!schema13) {
        output.push(`\nSchema: ${name} (NEW in v14)`);
        continue;
    }
    
    // basic property check
    const props14 = schema14.properties || {};
    const props13 = schema13.properties || {};
    
    let schemaDiffs = [];
    for (const [propName, prop14] of Object.entries(props14)) {
        if (!props13[propName]) {
            schemaDiffs.push(`  - NEW property: ${propName}`);
        } else {
            const type14 = prop14.type || prop14.$ref;
            const type13 = props13[propName].type || props13[propName].$ref;
            if (type14 !== type13) {
                schemaDiffs.push(`  - Property '${propName}' type changed: ${type13} -> ${type14}`);
            }
        }
    }
    for (const propName of Object.keys(props13)) {
        if (!props14[propName]) {
            schemaDiffs.push(`  - REMOVED property: ${propName}`);
        }
    }
    
    if (schemaDiffs.length > 0) {
        output.push(`\nSchema: ${name}`);
        output.push(...schemaDiffs);
    }
}

fs.writeFileSync('/Users/samflogar/Dev/vigvita-app/api_docs/comparison_report.txt', output.join('\n'));
console.log("Comparison complete. Written to api_docs/comparison_report.txt");
