const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({apiKey: 'AQ.Ab8RN6K5T1Vu6Bw4SkqqHOkDfRwSWpDRTe_BkmD97fgjHd3dMg'});

async function testModel(modelName) {
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: 'Hello'
        });
        console.log(`[SUCCESS] ${modelName}:`, response.text);
        return true;
    } catch (e) {
        console.error(`[ERROR] ${modelName}:`, e.message);
        return false;
    }
}

async function run() {
    const modelsToTest = [
        'gemini-2.0-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
        'gemini-3.5-flash-lite',
        'gemini-pro-latest',
        'gemma-4-26b-a4b-it'
    ];
    
    for (const m of modelsToTest) {
        const success = await testModel(m);
        if (success) {
            console.log(`\n✅ Found working model: ${m}\n`);
            break;
        }
    }
}

run();
