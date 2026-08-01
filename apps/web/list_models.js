const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({apiKey: 'AQ.Ab8RN6K5T1Vu6Bw4SkqqHOkDfRwSWpDRTe_BkmD97fgjHd3dMg'});
async function run() {
    try {
        const models = await ai.models.list();
        for await (const model of models) {
            console.log(model.name);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
