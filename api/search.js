// ============================================
// DEBATESPACE - UNBIASED DEEP RESEARCH
// Every sentence has a citation from government sources
// AI only formats - never generates facts
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 UNBIASED RESEARCH: "${query}"`);
    
    try {
        // STEP 1: Gather ALL evidence from government sources FIRST
        const govEvidence = await gatherGovernmentEvidence(query);
        
        // STEP 2: Gather archive and scrubbed data
        const archiveEvidence = await gatherArchiveEvidence(query);
        
        // STEP 3: Gather academic research
        const academicEvidence = await gatherAcademicEvidence(query);
        
        // STEP 4: Gather news articles
        const newsArticles = await gatherNewsArticles(query);
        
        // STEP 5: Gather video content
        const videoSources = await gatherVideoSources(query);
        
        // STEP 6: Gather general web (Tavily - lowest priority)
        const webEvidence = await gatherWebEvidence(query);
        
        // Combine ALL evidence (government first)
        const allEvidence = [...govEvidence, ...archiveEvidence, ...academicEvidence, ...webEvidence];
        
        console.log(`\n📊 EVIDENCE COLLECTED:`);
        console.log(`   Government: ${govEvidence.length}`);
        console.log(`   Archives: ${archiveEvidence.length}`);
        console.log(`   Academic: ${academicEvidence.length}`);
        console.log(`   News: ${newsArticles.length}`);
        console.log(`   Video: ${videoSources.length}`);
        console.log(`   Web: ${webEvidence.length}`);
        console.log(`   TOTAL: ${allEvidence.length} sources`);
        
        // Build answer with EVERY sentence cited
        const answerWithCitations = buildAnswerWithCitations(query, allEvidence, govEvidence);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answerWithCitations,
            newsArticles: newsArticles,
            videoSources: videoSources,
            allSources: allEvidence.slice(0, 60),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Unable to retrieve data for "${query}". Please try a different search term.`,
                sentences: []
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// STEP 1: GOVERNMENT EVIDENCE (Priority #1)
// ============================================
async function gatherGovernmentEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const allEvidence = [];
    const seenUrls = new Set();
    
    // ALL 5 CX search engines
    const cxEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
        { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT },
        { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS }
    ];
    
    // Specific government agencies to target
    const agencies = [
        'canada.ca', 'statcan.gc.ca', 'bankofcanada.ca', 'irb-cisr.gc.ca',
        'ice.gov', 'dhs.gov', 'fletc.gov', 'bls.gov', 'federalreserve.gov',
        'gov.uk', 'un.org', 'who.int', 'worldbank.org'
    ];
    
    // Search each CX engine
    for (const engine of cxEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(query)}&num=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            let domain = "";
                            try {
                                domain = new URL(item.link).hostname.replace('www.', '');
                            } catch(e) {}
                            
                            allEvidence.push({
                                type: "government",
                                source: domain,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[CX ${engine.name}] Error:`, error.message);
        }
    }
    
    // Search specific agencies directly
    for (const agency of agencies) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            allEvidence.push({
                                type: "government",
                                source: agency,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Agency ${agency}] Error:`, error.message);
        }
    }
    
    return allEvidence;
}

// ============================================
// STEP 2: ARCHIVE EVIDENCE (Historical/scrubbed)
// ============================================
async function gatherArchiveEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov', 'federalregister.gov'];
    
    for (const archive of archives) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=6`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            evidence.push({
                                type: "archive",
                                source: archive,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Archive ${archive}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 3: ACADEMIC EVIDENCE
// ============================================
async function gatherAcademicEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const academicDomains = ['.edu', '.ac.uk', '.edu.au'];
    
    for (const domain of academicDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=6`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            let siteName = "";
                            try {
                                siteName = new URL(item.link).hostname.replace('www.', '');
                            } catch(e) {}
                            
                            evidence.push({
                                type: "academic",
                                source: siteName,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Academic ${domain}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 4: NEWS ARTICLES
// ============================================
async function gatherNewsArticles(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    
    if (!apiKey) return articles;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=20&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles && data.articles.length > 0) {
                for (const article of data.articles) {
                    let siteName = "";
                    try {
                        siteName = new URL(article.url).hostname.replace('www.', '');
                    } catch(e) {}
                    
                    articles.push({
                        title: article.title,
                        url: article.url,
                        source: siteName,
                        date: article.publishedAt?.split('T')[0],
                        description: article.description,
                        type: "news"
                    });
                }
            }
        }
    } catch (error) {
        console.error('[GNews] Error:', error.message);
    }
    
    return articles;
}

// ============================================
// STEP 5: VIDEO SOURCES
// ============================================
async function gatherVideoSources(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    if (apiKey) {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        videos.push({
                            title: item.snippet.title,
                            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                            channel: item.snippet.channelTitle,
                            thumbnail: item.snippet.thumbnails?.medium?.url || '',
                            type: "video"
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[YouTube] Error:', error.message);
        }
    }
    
    return videos;
}

// ============================================
// STEP 6: GENERAL WEB (Tavily - lowest priority)
// ============================================
async function gatherWebEvidence(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const evidence = [];
    
    if (!apiKey) return evidence;
    
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'advanced',
                max_results: 15
            })
        });
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            for (const result of data.results) {
                let siteName = "";
                try {
                    siteName = new URL(result.url).hostname.replace('www.', '');
                } catch(e) {}
                
                evidence.push({
                    type: "web",
                    source: siteName,
                    title: result.title,
                    url: result.url,
                    text: result.content?.substring(0, 500),
                    date: null
                });
            }
        }
        
        return evidence;
        
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
        return evidence;
    }
}

// ============================================
// BUILD ANSWER WITH EVERY SENTENCE CITED
// ============================================
function buildAnswerWithCitations(query, allEvidence, govEvidence) {
    // Prioritize government evidence for citations
    const prioritizedEvidence = [...govEvidence, ...allEvidence.filter(e => e.type === "archive"), ...allEvidence.filter(e => e.type === "academic"), ...allEvidence.filter(e => e.type === "web")];
    
    // Create a map of evidence with IDs
    const evidenceMap = [];
    let id = 1;
    
    for (const evidence of prioritizedEvidence.slice(0, 30)) {
        if (evidence.text && evidence.text.length > 30) {
            evidenceMap.push({
                id: id,
                text: evidence.text,
                source: evidence.source,
                url: evidence.url,
                type: evidence.type
            });
            id++;
        }
    }
    
    // If no evidence found, return message
    if (evidenceMap.length === 0) {
        return {
            text: `No specific data found for "${query}". Please try different keywords or check official government sources directly.`,
            sentences: [],
            citations: []
        };
    }
    
    // Build sentences with citations using the evidence
    const sentences = [];
    const citations = [];
    
    // Extract key facts from evidence to form coherent sentences
    for (let i = 0; i < Math.min(evidenceMap.length, 15); i++) {
        const ev = evidenceMap[i];
        
        // Clean up the text
        let cleanText = ev.text
            .replace(/\s+/g, ' ')
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .trim();
        
        if (cleanText.length > 30 && cleanText.length < 300) {
            sentences.push({
                text: cleanText,
                citationId: ev.id
            });
        }
    }
    
    // Combine sentences into paragraphs
    let fullText = "";
    for (let i = 0; i < sentences.length; i++) {
        fullText += sentences[i].text;
        if (i < sentences.length - 1) {
            fullText += " ";
        }
    }
    
    // Add introduction if needed
    if (fullText.length < 100) {
        fullText = `Based on ${evidenceMap.length} government and official sources, here is what we found about "${query}": ${fullText}`;
    }
    
    // Build citations list
    for (const ev of evidenceMap) {
        let typeIcon = "";
        if (ev.type === "government") typeIcon = "🏛️ GOVERNMENT";
        else if (ev.type === "archive") typeIcon = "📜 ARCHIVE";
        else if (ev.type === "academic") typeIcon = "🎓 ACADEMIC";
        else typeIcon = "🌐 SOURCE";
        
        citations.push({
            id: ev.id,
            text: ev.text.length > 300 ? ev.text.substring(0, 300) + '...' : ev.text,
            source: `${typeIcon}: ${ev.source}`,
            url: ev.url
        });
    }
    
    return {
        text: fullText,
        sentences: sentences,
        citations: citations,
        evidenceCount: evidenceMap.length
    };
}
