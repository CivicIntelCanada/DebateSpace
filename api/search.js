// ============================================
// DEBATESPACE - PURE DISCOVERY RESEARCH WITH AI ANALYSIS
// Original research code preserved exactly
// Added: AI Analysis section that reviews the research findings
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 DISCOVERY RESEARCH: "${query}"`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    try {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        
        // ========================================
        // STEP 1: SEARCH ALL 5 CX ENGINES (Priority #1)
        // ========================================
        const cxEngines = [
            { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
            { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
            { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
            { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT },
            { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS }
        ];
        
        let allResults = [];
        
        // Search all CX engines
        for (const engine of cxEngines) {
            if (apiKey && engine.cx) {
                const results = await searchCXEngine(apiKey, engine.cx, query);
                allResults.push(...results);
                console.log(`${engine.name}: ${results.length} results`);
            }
        }
        
        // ========================================
        // STEP 2: SEARCH GOVERNMENT DOMAINS (Priority #2)
        // ========================================
        const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.mil', '.europa.eu'];
        
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovernmentDomain(apiKey, domain, query);
                allResults.push(...results);
                console.log(`${domain}: ${results.length} results`);
            }
        }
        
        // ========================================
        // STEP 3: SEARCH ARCHIVES (Historical/scrubbed data)
        // ========================================
        const archiveResults = await searchArchives(query);
        allResults.push(...archiveResults);
        console.log(`Archives: ${archiveResults.length} results`);
        
        // ========================================
        // STEP 4: GENERAL WEB (Tavily - lowest priority)
        // ========================================
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        console.log(`Tavily: ${tavilyResults.length} results`);
        
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
        
        console.log(`\n📊 TOTAL: ${uniqueResults.length} unique sources`);
        console.log(`   Government: ${uniqueResults.filter(r => r.isGovernment).length}`);
        console.log(`   Archives: ${uniqueResults.filter(r => r.type === 'archive').length}`);
        
        // ========================================
        // BUILD ANSWER WITH CITATIONS (Original)
        // ========================================
        const researchAnswer = buildAnswerWithCitations(query, uniqueResults);
        
        // ========================================
        // NEW: AI ANALYSIS OF THE RESEARCH FINDINGS
        // ========================================
        const aiAnalysis = await generateAIAnalysis(query, uniqueResults, researchAnswer);
        
        // ========================================
        // GET SUPPLEMENTAL CONTENT
        // ========================================
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: researchAnswer,      // Original research with citations
            aiAnalysis: aiAnalysis,         // NEW: AI analysis of the research
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 50),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('FATAL ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: {
                text: `Search completed. Found sources about "${query}". Please review the sources below.`,
                sentences: [],
                citations: [],
                evidenceCount: 0
            },
            aiAnalysis: {
                text: `Unable to generate analysis at this time. Please review the research sources below.`,
                sourcesUsed: 0
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// NEW: GENERATE AI ANALYSIS FROM RESEARCH FINDINGS
// ============================================
async function generateAIAnalysis(query, sources, researchAnswer) {
    const groqKey = process.env.GROQ_API_KEY;
    
    // If no Groq key or no sources, return fallback
    if (!groqKey || sources.length === 0) {
        return {
            text: `Based on ${sources.length} sources, the research findings are presented in the citations above. Please review the source materials for detailed information.`,
            sourcesUsed: sources.length,
            modelUsed: groqKey ? "Groq AI" : "No AI available"
        };
    }
    
    // Prepare the research data for AI analysis
    const topSources = sources.slice(0, 15);
    const sourceTexts = [];
    
    for (const source of topSources) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        if (quote.length > 50) {
            sourceTexts.push(`[${source.source}]: ${quote.substring(0, 400)}`);
        }
    }
    
    const researchSummary = researchAnswer.text || `Found ${sources.length} sources about "${query}".`;
    
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
                        content: `You are an objective research analyst. Your ONLY job is to analyze the provided research sources and summarize what they say.

STRICT RULES:
1. ONLY use information from the provided sources
2. DO NOT add any outside knowledge or opinions
3. DO NOT make assumptions beyond what the sources state
4. Be neutral and factual
5. If sources disagree, note the disagreement
6. Keep your analysis concise (200-300 words)
7. DO NOT include phrases like "based on the sources" or "according to the sources" - just state the facts

Your analysis should be a clear, direct answer to the user's question based SOLELY on the research provided.`
                    },
                    {
                        role: 'user',
                        content: `User Question: ${query}

Research Sources Found:
${sourceTexts.join('\n\n')}

Overall Research Summary: ${researchSummary}

Based ONLY on these research sources, provide a clear answer to the user's question.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 600
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            const analysis = data.choices?.[0]?.message?.content || `Based on ${sources.length} sources, the research findings are presented in the citations above.`;
            
            return {
                text: analysis,
                sourcesUsed: sources.length,
                modelUsed: "Groq Llama 3.3 (70B)",
                disclaimer: "AI analysis based solely on the research sources above"
            };
        } else {
            return {
                text: `Analysis unavailable. Please review the ${sources.length} research sources above for information about "${query}".`,
                sourcesUsed: sources.length,
                modelUsed: "Error - using fallback"
            };
        }
        
    } catch (error) {
        console.error('AI Analysis error:', error.message);
        return {
            text: `Unable to generate AI analysis. Please review the ${sources.length} research sources above.`,
            sourcesUsed: sources.length,
            modelUsed: "Error - using fallback"
        };
    }
}

// ============================================
// SEARCH A CX ENGINE (UNCHANGED)
// ============================================
async function searchCXEngine(apiKey, cx, query) {
    const results = [];
    const searchTerms = [query, `${query} official data`, `${query} report`, `${query} statistics`];
    
    for (const term of searchTerms.slice(0, 3)) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(term)}&num=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        const isGov = item.link.includes('.gov') || item.link.includes('.gc.ca') || item.link.includes('.mil');
                        results.push({
                            type: "cx",
                            source: new URL(item.link).hostname.replace('www.', ''),
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isGovernment: isGov,
                            searchTerm: term
                        });
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100));
        } catch (error) {
            console.error(`CX search error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// SEARCH GOVERNMENT DOMAINS (UNCHANGED)
// ============================================
async function searchGovernmentDomain(apiKey, domain, query) {
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
    } catch (error) {
        console.error(`Domain search ${domain} error:`, error.message);
    }
    
    return results;
}

// ============================================
// SEARCH ARCHIVES (UNCHANGED)
// ============================================
async function searchArchives(query) {
    const results = [];
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (!apiKey || !cx) return results;
    
    const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov', 'federalregister.gov'];
    
    for (const archive of archives) {
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
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isGovernment: true
                        });
                    }
                }
            }
            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.error(`Archive ${archive} error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// TAVILY SEARCH (UNCHANGED)
// ============================================
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
                    const isGov = result.url.includes('.gov') || result.url.includes('.gc.ca');
                    results.push({
                        type: "web",
                        source: new URL(result.url).hostname.replace('www.', ''),
                        title: result.title,
                        url: result.url,
                        snippet: result.content?.substring(0, 400),
                        isGovernment: isGov
                    });
                }
            }
        }
    } catch (error) {
        console.error('Tavily error:', error.message);
    }
    
    return results;
}

// ============================================
// GET NEWS (UNCHANGED)
// ============================================
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
                    title: article.title,
                    url: article.url,
                    source: new URL(article.url).hostname.replace('www.', ''),
                    date: article.publishedAt?.split('T')[0],
                    description: article.description?.substring(0, 150)
                }));
            }
        }
    } catch (error) {
        console.error('News error:', error.message);
    }
    
    return [];
}

// ============================================
// GET VIDEOS (UNCHANGED)
// ============================================
async function getVideos(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) return [];
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${apiKey}`;
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
    } catch (error) {
        console.error('Video error:', error.message);
    }
    
    return [];
}

// ============================================
// BUILD ANSWER WITH CITATIONS (UNCHANGED)
// ============================================
function buildAnswerWithCitations(query, sources) {
    const govSources = sources.filter(s => s.isGovernment === true);
    const otherSources = sources.filter(s => !s.isGovernment);
    const sortedSources = [...govSources, ...otherSources];
    
    if (sortedSources.length === 0) {
        return {
            text: `No sources found for "${query}". Try different keywords like "${query} statistics" or "${query} government data".`,
            sentences: [],
            citations: [],
            evidenceCount: 0
        };
    }
    
    const citations = [];
    const sentences = [];
    let citationId = 1;
    
    sentences.push({
        text: `Found ${sortedSources.length} sources (${govSources.length} government sources) about "${query}":`,
        citationId: null
    });
    
    for (const source of sortedSources.slice(0, 20)) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        
        if (quote.length > 50 && 
            !quote.toLowerCase().includes('search') && 
            !quote.toLowerCase().includes('loading') &&
            !quote.toLowerCase().includes('menu')) {
            
            const typeLabel = source.isGovernment ? "🏛️ GOVERNMENT" : "📄 SOURCE";
            
            sentences.push({
                text: quote.substring(0, 350),
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: quote.length > 450 ? quote.substring(0, 450) + '...' : quote,
                source: `${typeLabel}: ${source.source}`,
                url: source.url,
                title: source.title
            });
            
            citationId++;
        }
    }
    
    sentences.push({
        text: `Click any [number] to verify the original source. Each citation contains a direct quote from the source document.`,
        citationId: null
    });
    
    let fullText = "";
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        fullText += sentence.text;
        if (sentence.citationId) {
            fullText += ` [${sentence.citationId}]`;
        }
        fullText += " ";
    }
    
    return {
        text: fullText,
        sentences: sentences,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length
    };
}
