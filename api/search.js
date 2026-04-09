// api/search.js - Backend API route (keys are safe here in Vercel env vars)
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query } = req.body;
    
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Query is required' });
    }

    // Get keys from Vercel Environment Variables (secure)
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    // Your CSE IDs (these are not secrets - they're just identifiers)
    const CSE_IDS = {
        NA: 'b0528591b71c24d7c',
        Asia: 'e07b00c887caa4520',
        EU: 'a560578e892b4aa4',
        TT: 'a3ab7f589052b479a',
        News: '76a9d058500c24304'
    };

    if (!GOOGLE_API_KEY) {
        return res.status(500).json({ error: 'Missing GOOGLE_API_KEY environment variable' });
    }

    async function fetchWithTimeout(url, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    }

    // Search all CSEs in parallel
    async function searchAllGovernmentSources() {
        const allResults = [];
        const regions = Object.entries(CSE_IDS);
        
        const searchPromises = regions.map(async ([region, cxId]) => {
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${cxId}&q=${encodeURIComponent(query)}&num=6`;
                const resp = await fetchWithTimeout(url, 8000);
                const data = await resp.json();
                
                if (data.error) {
                    console.warn(`CSE ${region} error:`, data.error.message);
                    return [];
                }
                
                if (data.items) {
                    return data.items.map(item => ({
                        title: item.title,
                        link: item.link,
                        snippet: item.snippet,
                        source: new URL(item.link).hostname,
                        region: region
                    }));
                }
                return [];
            } catch (e) {
                console.warn(`CSE ${region} error:`, e);
                return [];
            }
        });
        
        const resultsArrays = await Promise.all(searchPromises);
        for (const results of resultsArrays) {
            allResults.push(...results);
        }
        
        // Remove duplicates
        const unique = [];
        const seen = new Set();
        for (const r of allResults) {
            if (!seen.has(r.link)) {
                seen.add(r.link);
                unique.push(r);
            }
        }
        return unique.slice(0, 25);
    }

    async function summarizeWithGroqFromSourcesOnly(query, govResults) {
        if (!GROQ_API_KEY) return null;
        if (govResults.length === 0) return null;
        
        const sourcesText = govResults.map((r, idx) => 
            `[SOURCE ${idx + 1}] REGION: ${r.region}\nTITLE: ${r.title}\nURL: ${r.link}\nEXCERPT: ${r.snippet || 'No excerpt available'}\n---`
        ).join('\n\n');
        
        const prompt = `You are a NEUTRAL, UNBIASED fact-checking AI for live debates. Your task is to analyze the QUERY using ONLY the government sources provided below. DO NOT use any external knowledge, your training data, or assumptions. If the sources don't contain enough information to answer, say "INSUFFICIENT DATA" and explain why.

QUERY: "${query}"

GOVERNMENT SOURCES (USE ONLY THESE - DO NOT USE EXTERNAL KNOWLEDGE):
${sourcesText}

INSTRUCTIONS:
1. Read ONLY the sources above
2. Extract factual claims that directly address the query
3. Note any contradictions BETWEEN the sources
4. Provide a verdict based SOLELY on these sources

Respond with valid JSON only:
{
  "verdict": "FACT" or "DEBUNK" or "MIXED" or "INSUFFICIENT_DATA",
  "confidence": 0-100,
  "summary": "2-3 sentence summary using ONLY information from the sources above",
  "key_findings": ["finding1", "finding2", "finding3"],
  "contradictions": "describe any contradictions between sources, or 'None found'",
  "missing_context": "what information would be needed from additional sources to be more confident?"
}`;

        try {
            const resp = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ 
                        role: 'system', 
                        content: 'You are a strict fact-checker. You may ONLY use information from the sources provided in the user message. Never use your own knowledge. If sources lack information, say INSUFFICIENT_DATA.' 
                    }, { 
                        role: 'user', 
                        content: prompt 
                    }],
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                })
            }, 15000);
            
            const data = await resp.json();
            if (data.choices && data.choices[0]) {
                return JSON.parse(data.choices[0].message.content);
            }
            return null;
        } catch (e) {
            console.warn('GROQ analysis failed:', e);
            return null;
        }
    }

    try {
        // Search all government sources
        const govResults = await searchAllGovernmentSources();
        
        // Analyze with GROQ (only using these sources)
        const analysis = await summarizeWithGroqFromSourcesOnly(query, govResults);
        
        // Return results to frontend
        res.status(200).json({
            govResults: govResults,
            analysis: analysis
        });
        
    } catch (error) {
        console.error('Backend error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
}
