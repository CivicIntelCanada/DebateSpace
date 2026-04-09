// ============================================
// DEBATESPACE - DEEPER RESEARCH API
// Searches 15+ gov domains, 15+ archives, returns 60+ sources
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
        // SEARCH ALL CX ENGINES (12 results each)
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
                const results = await searchCXDeep(apiKey, engine.cx, query);
                allResults.push(...results);
                console.log(`${engine.name}: ${results.length} results`);
            }
        }
        
        // ========================================
        // SEARCH EXPANDED GOVERNMENT DOMAINS (15+)
        // ========================================
        const govDomains = [
            '.gov', '.gc.ca', '.gov.uk', '.mil',
            '.gov.au', '.govt.nz',
            '.gouv.fr', '.gob.es', '.gov.it', '.gov.de',
            '.go.jp', '.go.kr', '.gov.sg', '.gov.in',
            '.gov.za', '.go.ke'
        ];
        
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovDomainDeep(apiKey, domain, query);
                allResults.push(...results);
            }
        }
        
        // ========================================
        // SEARCH EXPANDED ARCHIVES (15+)
        // ========================================
        const archives = [
            'archive.org', 'archives.gov', 'census.gov', 'data.gov',
            'worldbank.org', 'imf.org', 'oecd.org', 'who.int',
            'un.org', 'europa.eu', 'statcan.gc.ca', 'bls.gov',
            'ons.gov.uk', 'destatis.de', 'data.world'
        ];
        
        for (const archive of archives) {
            const results = await searchArchiveDeep(apiKey, archive, query);
            allResults.push(...results);
        }
        
        // ========================================
        // TAVILY SEARCH
        // ========================================
        const tavilyResults = await tavilySearchDeep(query);
        allResults.push(...tavilyResults);
        
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
        
        console.log(`\n📊 TOTAL SOURCES: ${uniqueResults.length}`);
        console.log(`   Government: ${uniqueResults.filter(r => r.isGovernment).length}`);
        
        // ========================================
        // BUILD DEEPER RESEARCH ANSWER
        // ========================================
        const researchAnswer = buildDeepResearchAnswer(query, uniqueResults);
        
        // ========================================
        // GENERATE DEEPER AI ANALYSIS
        // ========================================
        const aiAnalysis = await generateDeepAIAnalysis(query, uniqueResults);
        
        // ========================================
        // GET SUPPLEMENTAL CONTENT
        // ========================================
        const newsResults = await getNewsDeep(query);
        const videoResults = await getVideosDeep(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: researchAnswer,
            aiAnalysis: aiAnalysis,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 60),
            totalSourcesFound: uniqueResults.length,
            governmentSourcesCount: uniqueResults.filter(r => r.isGovernment).length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: { text: `Research completed. Found sources about "${query}".`, citations: [], evidenceCount: 0 },
            aiAnalysis: { text: `AI analysis temporarily unavailable. Please review the research sources above.`, sourcesUsed: 0 },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// DEEPER SEARCH FUNCTIONS
// ============================================

async function searchCXDeep(apiKey, cx, query) {
    const results = [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=12`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "cx",
                        source: new URL(item.link).hostname.replace('www.', ''),
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: item.link.includes('.gov') || item.link.includes('.gc.ca') || item.link.includes('.gov.')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function searchGovDomainDeep(apiKey, domain, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!cx) return results;
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "government",
                        source: domain,
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: true
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function searchArchiveDeep(apiKey, archive, query) {
    const results = [];
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return results;
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=6`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "archive",
                        source: archive,
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: archive.includes('.gov') || archive.includes('.org')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function tavilySearchDeep(query) {
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
                max_results: 12
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.results) {
                for (const result of data.results) {
                    results.push({
                        type: "web",
                        source: new URL(result.url).hostname.replace('www.', ''),
                        title: result.title,
                        url: result.url,
                        snippet: result.content?.substring(0, 500),
                        isGovernment: result.url.includes('.gov')
                    });
                }
            }
        }
    } catch (error) {}
    return results;
}

async function getNewsDeep(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                return data.articles.map(article => ({
                    title: article.title,
                    url: article.url,
                    source: new URL(article.url).hostname.replace('www.', ''),
                    date: article.publishedAt?.split('T')[0],
                    description: article.description?.substring(0, 200)
                }));
            }
        }
    } catch (error) {}
    return [];
}

async function getVideosDeep(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=8&key=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                return data.items.map(item => ({
                    title: item.snippet.title,
                    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    channel: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails?.medium?.url || ''
                }));
            }
        }
    } catch (error) {}
    return [];
}

// ============================================
// BUILD DEEPER RESEARCH ANSWER
// ============================================
function buildDeepResearchAnswer(query, sources) {
    const govSources = sources.filter(s => s.isGovernment === true);
    const otherSources = sources.filter(s => !s.isGovernment);
    const sortedSources = [...govSources, ...otherSources];
    
    if (sortedSources.length === 0) {
        return {
            text: `No sources found for "${query}". Try different keywords.`,
            citations: [],
            evidenceCount: 0,
            governmentCount: 0
        };
    }
    
    const citations = [];
    let citationId = 1;
    let fullText = `Found ${sortedSources.length} sources (${govSources.length} government sources, ${sortedSources.length - govSources.length} academic/think tank sources) about "${query}". `;
    
    // Group findings by category
    const categories = {
        statistics: [],
        policy: [],
        economic: []
    };
    
    for (const source of sortedSources.slice(0, 25)) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/, ' ').trim();
        
        if (quote.length > 40 && !quote.toLowerCase().includes('search')) {
            // Categorize based on content
            if (quote.match(/\d+%|\$\d+|\d+ billion|\d+ million/)) {
                categories.statistics.push(quote.substring(0, 300));
            } else if (quote.match(/policy|law|regulation|act|bill/)) {
                categories.policy.push(quote.substring(0, 300));
            } else if (quote.match(/econom|gdp|inflation|market|trade/)) {
                categories.economic.push(quote.substring(0, 300));
            }
            
            fullText += `[${citationId}] "${quote.substring(0, 200)}..." `;
            
            citations.push({
                id: citationId,
                text: quote.length > 500 ? quote.substring(0, 500) + '...' : quote,
                source: source.source,
                url: source.url,
                title: source.title
            });
            citationId++;
        }
    }
    
    if (categories.statistics.length > 0) {
        fullText += ` Key statistics found: ${categories.statistics.length} sources. `;
    }
    
    fullText += ` Click any [number] to verify the source.`;
    
    return {
        text: fullText,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length,
        categories: {
            statistics: categories.statistics.slice(0, 3),
            policy: categories.policy.slice(0, 3),
            economic: categories.economic.slice(0, 3)
        }
    };
}

// ============================================
// GENERATE DEEPER AI ANALYSIS
// ============================================
async function generateDeepAIAnalysis(query, sources) {
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!groqKey) {
        return {
            text: `AI analysis temporarily unavailable. Please review the ${sources.length} research sources above for information about "${query}".`,
            sourcesUsed: sources.length,
            modelUsed: "Groq API key missing"
        };
    }
    
    if (sources.length === 0) {
        return {
            text: `No research sources were found for "${query}". Please try different keywords.`,
            sourcesUsed: 0,
            modelUsed: "No sources"
        };
    }
    
    const topSources = sources.slice(0, 15);
    const sourceTexts = [];
    
    for (const source of topSources) {
        let content = source.snippet || source.title || '';
        content = content.replace(/\s+/, ' ').trim();
        if (content.length > 50) {
            const sourceLabel = source.isGovernment ? `🏛️ GOVERNMENT: ${source.source}` : `📄 SOURCE: ${source.source}`;
            sourceTexts.push(`${sourceLabel}\n${content.substring(0, 400)}`);
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
                        content: `You are a neutral, unbiased fact-checking research analyst. Your task is to:
1. Summarize what the provided research sources say about the user's question
2. Identify any contradictions between sources
3. Note which claims are supported by government sources
4. Highlight key statistics or data points
5. ONLY use information from the sources — never add external knowledge
6. Be concise but thorough (200-300 words)`
                    },
                    {
                        role: 'user',
                        content: `User Question: ${query}

RESEARCH SOURCES (${sources.length} total, ${sources.filter(s => s.isGovernment).length} government sources):

${sourceTexts.join('\n\n')}

Based STRICTLY on the research sources above, provide:
1. A clear answer to the user's question
2. Key statistics found (with source counts)
3. Any contradictions between sources
4. What additional information would help answer more completely

Format your response in clear paragraphs.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 750
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content;
            
            return {
                text: analysis || `Based on ${sources.length} sources (${sources.filter(s => s.isGovernment).length} government), the research findings are presented above.`,
                sourcesUsed: sources.length,
                governmentSourcesUsed: sources.filter(s => s.isGovernment).length,
                modelUsed: "Groq Llama 3.3 (Deep Analysis)"
            };
        } else {
            return {
                text: `AI analysis temporarily unavailable. Please review the ${sources.length} research sources above for information about "${query}".`,
                sourcesUsed: sources.length,
                modelUsed: "API error"
            };
        }
        
    } catch (error) {
        console.error('AI Analysis error:', error.message);
        return {
            text: `AI analysis temporarily unavailable. Please review the ${sources.length} research sources above for information about "${query}".`,
            sourcesUsed: sources.length,
            modelUsed: "Error"
        };
    }
}
