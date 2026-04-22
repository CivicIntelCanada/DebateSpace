// ============================================
// DEBATESPACE - DEEP RESEARCH v2
// Changes: No hardcoded data, gov priority, citations in AI, exclude low-authority sites
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 DEEP RESEARCH: "${query}"`);
    
    try {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        let allResults = [];
        
        // ========================================
        // SEARCH ALL CX ENGINES
        // ========================================
        const cxEngines = [
            { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
            { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
            { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
            { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT },
            { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS }
        ];
        
        for (const engine of cxEngines) {
            if (apiKey && engine.cx) {
                const results = await searchCX(apiKey, engine.cx, query);
                allResults.push(...results);
                console.log(`${engine.name}: ${results.length} results`);
            }
        }
        
        // ========================================
        // SEARCH GOVERNMENT DOMAINS (expanded)
        // ========================================
        const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.mil', '.gov.au', '.govt.nz', '.gouv.fr', '.gob.es', '.gov.it', '.gov.de', '.go.jp', '.go.kr', '.gov.sg', '.gov.in'];
        
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovDomain(apiKey, domain, query);
                allResults.push(...results);
            }
        }
        
        // ========================================
        // SEARCH ARCHIVES
        // ========================================
        const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov', 'worldbank.org', 'imf.org', 'oecd.org', 'who.int', 'un.org', 'europa.eu', 'statcan.gc.ca', 'bls.gov', 'ons.gov.uk'];
        
        for (const archive of archives) {
            const results = await searchArchive(apiKey, archive, query);
            allResults.push(...results);
        }
        
        // ========================================
        // TAVILY SEARCH
        // ========================================
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        
        // ========================================
        // FILTER OUT LOW-AUTHORITY SITES
        // ========================================
        const blockedDomains = ['wikipedia.org', 'reddit.com', 'blogspot.com', 'wordpress.com', 'medium.com', 'quora.com', 'wikia.com', 'fandom.com'];
        allResults = allResults.filter(result => {
            const url = result.url || '';
            const source = result.source || '';
            return !blockedDomains.some(blocked => url.includes(blocked) || source.includes(blocked));
        });
        
        // ========================================
        // REMOVE DUPLICATES
        // ========================================
        const uniqueResults = [];
        const seenUrls = new Set();
        for (const result of allResults) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                uniqueResults.push(result);
            }
        }
        
        // Fix: Properly identify government sources (check URL and source field)
        for (const result of uniqueResults) {
            const url = result.url || '';
            const source = result.source || '';
            result.isGovernment = (
                url.includes('.gov') || 
                url.includes('.gc.ca') || 
                url.includes('.mil') ||
                url.includes('.gov.uk') ||
                url.includes('.gov.au') ||
                url.includes('.govt.nz') ||
                source.includes('.gov') ||
                source.includes('gc.ca')
            );
        }
        
        // Sort: government first, then think tanks, then news
        uniqueResults.sort((a, b) => {
            if (a.isGovernment && !b.isGovernment) return -1;
            if (!a.isGovernment && b.isGovernment) return 1;
            return 0;
        });
        
        const govCount = uniqueResults.filter(r => r.isGovernment).length;
        console.log(`\n📊 TOTAL SOURCES: ${uniqueResults.length} (${govCount} government)`);
        
        // ========================================
        // BUILD DEEP RESEARCH ANSWER (with full sentences + citations)
        // ========================================
        const researchAnswer = buildDeepResearchAnswer(query, uniqueResults);
        
        // ========================================
        // GENERATE AI ANALYSIS WITH CITATIONS
        // ========================================
        const aiAnalysis = await generateAIAnalysisWithCitations(query, uniqueResults);
        
        // ========================================
        // GET SUPPLEMENTAL CONTENT
        // ========================================
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: researchAnswer,
            aiAnalysis: aiAnalysis,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 60),
            totalSourcesFound: uniqueResults.length,
            governmentSourcesCount: govCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: { text: `Research completed. Found sources about "${query}".`, citations: [], evidenceCount: 0, governmentCount: 0 },
            aiAnalysis: { text: `AI analysis temporarily unavailable. Please review the research sources above.`, sourcesUsed: 0 },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

async function searchCX(apiKey, cx, query) {
    const results = [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "cx",
                        source: new URL(item.link).hostname.replace('www.', ''),
                        title: cleanText(item.title),
                        url: item.link,
                        snippet: cleanText(item.snippet || ''),
                        isGovernment: false
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function searchGovDomain(apiKey, domain, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!cx) return results;
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=6`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "government",
                        source: domain,
                        title: cleanText(item.title),
                        url: item.link,
                        snippet: cleanText(item.snippet || ''),
                        isGovernment: true
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function searchArchive(apiKey, archive, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return results;
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=5`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "archive",
                        source: archive,
                        title: cleanText(item.title),
                        url: item.link,
                        snippet: cleanText(item.snippet || ''),
                        isGovernment: archive.includes('.gov') || archive.includes('.org')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function tavilySearch(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const results = [];
    if (!apiKey) return results;
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                api_key: apiKey, 
                query: query, 
                search_depth: 'advanced', 
                max_results: 10
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.results) {
                for (const result of data.results) {
                    results.push({
                        type: "web",
                        source: new URL(result.url).hostname.replace('www.', ''),
                        title: cleanText(result.title),
                        url: result.url,
                        snippet: cleanText(result.content?.substring(0, 500) || ''),
                        isGovernment: result.url.includes('.gov')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function getNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&token=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                return data.articles.map(article => ({
                    title: cleanText(article.title),
                    url: article.url,
                    source: new URL(article.url).hostname.replace('www.', ''),
                    date: article.publishedAt?.split('T')[0],
                    description: cleanText(article.description?.substring(0, 200) || '')
                }));
            }
        }
    } catch (error) {}
    return [];
}

async function getVideos(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                return data.items.map(item => ({
                    title: cleanText(item.snippet.title),
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    channel: cleanText(item.snippet.channelTitle),
                    thumbnail: item.snippet.thumbnails?.medium?.url || ''
                }));
            }
        }
    } catch (error) {}
    return [];
}

function cleanText(text) {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    cleaned = cleaned.replace(/\n#{1,6}\s+/g, '\n');
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

// ============================================
// DEEP RESEARCH ANSWER (with full sentences + citations)
// ============================================
function buildDeepResearchAnswer(query, sources) {
    const govSources = sources.filter(s => s.isGovernment === true);
    const otherSources = sources.filter(s => !s.isGovernment);
    
    if (sources.length === 0) {
        return {
            text: `No sources found for "${query}". Try different keywords.`,
            citations: [],
            evidenceCount: 0,
            governmentCount: 0,
            categories: {},
            compilerSummary: "No sources available."
        };
    }
    
    const citations = [];
    let citationId = 1;
    
    // Organize by category with full sentences
    const categories = {
        statistics: [],
        policy: [],
        economic: []
    };
    
    for (const source of sources.slice(0, 30)) {
        let quote = source.snippet || source.title || '';
        quote = cleanText(quote);
        if (quote.length > 40 && !quote.toLowerCase().includes('search')) {
            let category = 'statistics';
            if (quote.match(/policy|law|regulation|act|bill|plan|strategy|program/i)) category = 'policy';
            else if (quote.match(/econom|gdp|inflation|market|trade|fee|cost|price|tax/i)) category = 'economic';
            
            // Build full sentence
            let sentence = `According to ${source.source}, "${quote.substring(0, 200)}..."`;
            categories[category].push({
                sentence: sentence,
                citationId: citationId,
                url: source.url
            });
            
            citations.push({
                id: citationId,
                text: quote.length > 450 ? quote.substring(0, 450) + '...' : quote,
                source: source.source,
                url: source.url,
                title: source.title
            });
            citationId++;
        }
    }
    
    // Build compiler summary (sentences listing all major sources)
    const uniqueSources = [...new Map(sources.map(s => [s.source, s])).values()].slice(0, 15);
    let compilerSummary = `This research synthesized information from ${sources.length} sources, including ${govSources.length} government sources. `;
    compilerSummary += `Key sources consulted: ${uniqueSources.map(s => s.source).join(', ')}. `;
    compilerSummary += `All citations are linked to original documents for verification.`;
    
    return {
        text: `Found ${sources.length} sources (${govSources.length} government) about "${query}". Below are key findings organized by category. Click any [number] to verify.`,
        citations: citations,
        evidenceCount: sources.length,
        governmentCount: govSources.length,
        categories: categories,
        compilerSummary: compilerSummary
    };
}

// ============================================
// AI ANALYSIS WITH CITATIONS
// ============================================
async function generateAIAnalysisWithCitations(query, sources) {
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!groqKey || sources.length === 0) {
        return {
            text: `AI analysis unavailable. Please review the ${sources.length} research sources above.`,
            sourcesUsed: sources.length,
            governmentSourcesUsed: sources.filter(s => s.isGovernment).length,
            modelUsed: "Groq API missing or no sources",
            citations: []
        };
    }
    
    const topSources = sources.slice(0, 12);
    const sourceTexts = [];
    for (const source of topSources) {
        let content = source.snippet || source.title || '';
        content = cleanText(content);
        if (content.length > 50) {
            const label = source.isGovernment ? `[GOV:${source.source}]` : `[${source.source}]`;
            sourceTexts.push(`${label} ${content.substring(0, 400)} ||| URL: ${source.url}`);
        }
    }
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a neutral fact-checking AI. Answer using ONLY the provided sources. For each factual claim, add a citation like [source: URL] at the end of the sentence. Use plain text, no markdown.`
                    },
                    {
                        role: 'user',
                        content: `Question: ${query}\n\nSources:\n${sourceTexts.join('\n\n')}\n\nProvide a clear, factual answer with citations [source: URL] after each sentence.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 800
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            let analysis = data.choices?.[0]?.message?.content || '';
            analysis = cleanText(analysis);
            
            // Extract citations from the AI response
            const citationRegex = /\[source:\s*(https?:\/\/[^\s\]]+)\]/gi;
            const foundUrls = [...analysis.matchAll(citationRegex)].map(m => m[1]);
            
            return {
                text: analysis,
                sourcesUsed: sources.length,
                governmentSourcesUsed: sources.filter(s => s.isGovernment).length,
                modelUsed: "Groq Llama 3.3 with citations",
                citations: foundUrls
            };
        } else {
            throw new Error('Groq API error');
        }
    } catch (error) {
        console.error('AI error:', error.message);
        return {
            text: `AI analysis temporarily unavailable. Please review the ${sources.length} research sources above.`,
            sourcesUsed: sources.length,
            governmentSourcesUsed: sources.filter(s => s.isGovernment).length,
            modelUsed: "Error - see sources",
            citations: []
        };
    }
}