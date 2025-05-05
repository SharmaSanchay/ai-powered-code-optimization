const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const analyzeCode = require('./service/AIcode');
const run = require('./service/run');

// Middleware
app.use(cors({
    origin: "*",
}));
app.use(express.json());

// Analyze code endpoint
app.post('/issue', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "No code provided" });
        }
        console.log(code);
        const issue = await analyzeCode(code);
        return res.json(issue);
    } catch (error) {
        console.error("Error analyzing code:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post('/run',async (req,res)=>{
    const {code,language} = req.body;
    try{
        const response = await run(code,language);
        return res.json(response);
    }
    catch(error){
        return res.json({error});
    }
})
// Start server
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});