const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const generateCodeAnalysisPrompt= (code)=>{
  const str = `you are a expert programmer in the multiple programming language and you 
  task is to analysis the code and provide the feeback and also provide the correct code 
  and you have to use the ✅❌📝 such bitmoji and emoji and code part must have a higher font and the resposne should easy to understand more human reabable and short as much as possible but with nesscesary explaination. Here's the code that you need
  to take a look ${code} `
  return str;
}
function removeDoubleAsterisks(str) {
  return str.replace(/\*\*/g, '');
}
async function analyzeCode(code){
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: generateCodeAnalysisPrompt(code),
    });
    return removeDoubleAsterisks(response.text);
  } catch (error) {
    console.log(error);
    return "something went wrong!!!!!";
  }
}

module.exports = analyzeCode;