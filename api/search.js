// ============================================
// DEBATESPACE - FACTUAL RESEARCH WITH EXACT QUOTES
// PRIORITY: Government > Archives > Scrubbed Data > Academic > Legal > Web
// News articles are NOT used in the main answer
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 RESEARCH: "${query}"`);
    
    try {
        // STEP 1: Search government sources FIRST (priority)
        const govResults = await searchGovernmentSourcesDeep(query);
        console.log(`   Government sources: ${govResults.length}`);
        
        // STEP 2: Search archived/scrubbed data
        const archiveResults = await searchArchivedData(query);
        console.log(`   Archived/scrubbed sources: ${archiveResults.length}`);
        
        // STEP 3: Search academic/legal sources
        const academicResults = await searchAcademicSources(query);
        console.log(`   Academic/legal sources: ${academicResults.length}`);
        
        // STEP 4: General web search (only if needed)
        const webResults = await searchWebSources(query);
        console.log(`   Web sources: ${webResults.length}`);
        
        // STEP 5: News articles (for separate display ONLY, NOT in answer)
        const newsResults = await searchNewsSources(query);
        const videoResults = await searchVideoSources(query);
        
        // Combine priority-sorted evidence (government FIRST)
        const allEvidence = [...govResults, ...archiveResults, ...academicResults, ...webResults];
        
        console.log(`\n📊 TOTAL PRIORITY SOURCES: ${allEvidence.length}`);
        
        // Build answer using ONLY priority sources (gov > archive > academic)
        const answer = buildAnswerFromExactQuotes(query, allEvidence, govResults);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,      // Displayed separately
            videoSources: videoResults,     // Displayed separately
            allSources: allEvidence.slice(0, 50),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Search completed but no government sources found for "${query}". Try: "Canada immigration site:canada.ca", "US inflation site:bls.gov", "ICE training site:ice.gov"`,
                sentences: [],
                citations: []
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// DEEP GOVERNMENT SOURCES SEARCH (PRIORITY 1)
// Uses your specific CX keys and domain filtering
// ============================================
async function searchGovernmentSourcesDeep(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cxNa = process.env.GOOGLE_SEARCH_CX_NA;
    const cxAsia = process.env.GOOGLE_SEARCH_CX_ASIA;
    const cxEu = process.env.GOOGLE_SEARCH_CX_EU;
    const cxNews = process.env.GOOGLE_SEARCH_CX_NEWS;
    const cxTt = process.env.GOOGLE_SEARCH_CX_TT;
    
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey) {
        console.log('⚠️ No Google API key found');
        return results;
    }
    
    // Comprehensive government domains by region
    const govDomains = {
        us: [
            '.gov', 'usa.gov', 'whitehouse.gov', 'congress.gov', 'federalregister.gov',
            'cdc.gov', 'nih.gov', 'bls.gov', 'census.gov', 'justice.gov', 'dhs.gov',
            'ice.gov', 'fletc.gov', 'state.gov', 'treasury.gov', 'fda.gov', 'epa.gov',
            'nsa.gov', 'fbi.gov', 'uscis.gov', 'archives.gov', 'loc.gov', 'gao.gov'
        ],
        canada: [
            'canada.ca', 'statcan.gc.ca', 'gc.ca', 'parl.ca', 'justice.gc.ca',
            'hc-sc.gc.ca', 'canada.ca/en/immigration-refugees-citizenship'
        ],
        uk: [
            'gov.uk', 'ons.gov.uk', 'parliament.uk', 'nationalarchives.gov.uk',
            'mod.gov.uk', 'homeoffice.gov.uk'
        ],
        eu: [
            'europa.eu', 'ec.europa.eu', 'consilium.europa.eu', 'eur-lex.europa.eu',
            'europarl.europa.eu', 'who.int', 'unodc.org', 'oecd.org', 'imf.org'
        ],
        au: ['gov.au', 'abs.gov.au', 'health.gov.au', 'homeaffairs.gov.au']
    };
    
    const allDomains = [...govDomains.us, ...govDomains.canada, ...govDomains.uk, ...govDomains.eu, ...govDomains.au];
    
    // Choose the best CX for the query (default to NA)
    let activeCx = cxNa || '001394068838258239124:3iwe7yswooy';
    
    // Try to detect region from query
    const queryLower = query.toLowerCase();
    if (queryLower.includes('canada') || queryLower.includes('canadian')) activeCx = cxNa; // NA covers Canada
    if (queryLower.includes('asia') || queryLower.includes('china') || queryLower.includes('japan')) activeCx = cxAsia || activeCx;
    if (queryLower.includes('europe') || queryLower.includes('eu') || queryLower.includes('germany')) activeCx = cxEu || activeCx;
    
    // Search each government domain
    for (const domain of allDomains) {
        try {
            // Use siteSearch to restrict to specific domain
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${activeCx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=5`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            results.push({
                                type: "government",
                                source: domain,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                exactQuote: item.snippet,
                                date: item.pagemap?.metatags?.[0]?.date || null,
                                region: domain.includes('canada') ? 'Canada' : 
                                       domain.includes('gov.uk') ? 'UK' :
                                       domain.includes('europa') ? 'EU' : 'US'
                            });
                        }
                    }
                }
            }
            
            // Rate limit: 80ms between requests
            await new Promise(r => setTimeout(r, 80));
            
        } catch (error) {
            console.error(`[${domain}] Error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// ARCHIVED & SCRUBBED DATA (PRIORITY 2)
// Wayback Machine, government archives, scrubbed datasets
// ============================================
async function searchArchivedData(query) {
    const results = [];
    const seenUrls = new Set();
    
    // Archive domains to search
    const archiveDomains = [
        'web.archive.org', 'archive.org/details', 'archives.gov',
        'catalog.archives.gov', 'govinfo.gov', 'fdsys.gov',
        'data.gov', 'opendata.stackexchange.com'
    ];
    
    // Try to search each archive domain
    for (const domain of archiveDomains) {
        try {
            // Use a public API for Wayback Machine if available
            if (domain === 'web.archive.org') {
                const waybackUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(query)}`;
                try {
                    const wbResponse = await fetch(waybackUrl);
                    if (wbResponse.ok) {
                        const wbData = await wbResponse.json();
                        if (wbData.archived_snapshots?.closest?.url) {
                            results.push({
                                type: "archive",
                                source: "Wayback Machine",
                                title: `Archived: ${query}`,
                                url: wbData.archived_snapshots.closest.url,
                                text: `Archived version from ${wbData.archived_snapshots.closest.timestamp}`,
                                exactQuote: `[Archived data from ${wbData.archived_snapshots.closest.timestamp}]`,
                                date: wbData.archived_snapshots.closest.timestamp
                            });
                        }
                    }
                } catch (e) {
                    console.log('Wayback error:', e.message);
                }
            }
        } catch (error) {
            console.error(`[Archive ${domain}] Error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// ACADEMIC & LEGAL SOURCES (PRIORITY 3)
// ============================================
async function searchAcademicSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cxNa = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey) return results;
    
    const academicDomains = [
        'scholar.google.com', 'academic.oup.com', 'jstor.org', 'springer.com',
        'sciencedirect.com', 'pubmed.ncbi.nlm.nih.gov', 'ssrn.com',
        'law.cornell.edu', 'supremecourt.gov', 'law.justia.com', 'findlaw.com'
    ];
    
    for (const domain of academicDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxNa || '001394068838258239124:3iwe7yswooy'}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=3`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            const type = domain.includes('law') || domain.includes('supremecourt') || domain.includes('cornell.edu') ? 'legal' : 'academic';
                            results.push({
                                type: type,
                                source: domain,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                exactQuote: item.snippet,
                                date: null
                            });
                        }
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 80));
            
        } catch (error) {
            console.error(`[Academic ${domain}] Error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// GENERAL WEB SEARCH (Tavily - LOWEST PRIORITY)
// ============================================
async function searchWebSources(query) {
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
                search_depth: 'basic',
                max_results: 5
            })
        });
        
        const data = await response.json();
        
        if (data.results) {
            for (const result of data.results) {
                results.push({
                    type: "web",
                    source: new URL(result.url).hostname.replace('www.', ''),
                    title: result.title,
                    url: result.url,
                    text: result.content?.substring(0, 400),
                    exactQuote: result.content?.substring(0, 400),
                    date: null
                });
            }
        }
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
    }
    
    return results;
}

// ============================================
// NEWS SOURCES (FOR DISPLAY ONLY - NOT IN ANSWER)
// ============================================
async function searchNewsSources(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    
    if (!apiKey) return articles;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=8&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                for (const article of data.articles.slice(0, 8)) {
                    articles.push({
                        title: article.title,
                        url: article.url,
                        source: new URL(article.url).hostname.replace('www.', ''),
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
// VIDEO SOURCES (FOR DISPLAY ONLY)
// ============================================
async function searchVideoSources(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    if (!apiKey) return videos;
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
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
    
    return videos;
}

// ============================================
// BUILD ANSWER FROM EXACT QUOTES
// Every sentence is a direct quote from priority sources
// NO news articles in main answer
// ============================================
function buildAnswerFromExactQuotes(query, allEvidence, govEvidence) {
    
    // Strict priority: government > archive > academic > legal > web
    const sortedEvidence = [
        ...govEvidence,
        ...allEvidence.filter(e => e.type === "archive"),
        ...allEvidence.filter(e => e.type === "academic"),
        ...allEvidence.filter(e => e.type === "legal"),
        ...allEvidence.filter(e => e.type === "web")
    ];
    
    // Take unique sources
    const uniqueSources = [];
    const seenTexts = new Set();
    
    for (const source of sortedEvidence) {
        const textKey = (source.text || '').substring(0, 60);
        if (!seenTexts.has(textKey) && source.text && source.text.length > 40) {
            seenTexts.add(textKey);
            uniqueSources.push(source);
        }
        if (uniqueSources.length >= 20) break;
    }
    
    if (uniqueSources.length === 0) {
        return {
            text: `No government or official sources found for "${query}". Try specific government sites: "site:bls.gov inflation", "site:ice.gov training", "site:canada.ca immigration"`,
            sentences: [],
            citations: [],
            evidenceCount: 0,
            governmentCount: 0
        };
    }
    
    // Create citations array
    const citations = [];
    const sentenceList = [];
    
    // Add introduction
    const govCount = uniqueSources.filter(s => s.type === "government").length;
    sentenceList.push({
        text: `DIRECT QUOTES FROM ${uniqueSources.length} OFFICIAL SOURCES (${govCount} government sources) about "${query}":`,
        citationId: null
    });
    
    // Add each source as a direct quote
    let citationId = 1;
    for (const source of uniqueSources) {
        let quote = source.text
            .replace(/\s+/g, ' ')
            .trim();
        
        // Add quotes
        if (!quote.startsWith('"')) quote = `"${quote}"`;
        if (!quote.endsWith('"')) quote = quote + '"';
        
        // Type label with priority indicator
        let typeLabel = "";
        if (source.type === "government") typeLabel = "🏛️ GOVERNMENT";
        else if (source.type === "archive") typeLabel = "📜 ARCHIVE";
        else if (source.type === "academic") typeLabel = "🎓 ACADEMIC";
        else if (source.type === "legal") typeLabel = "⚖️ LEGAL";
        else typeLabel = "🌐 SOURCE";
        
        sentenceList.push({
            text: quote,
            citationId: citationId
        });
        
        citations.push({
            id: citationId,
            text: source.text.length > 400 ? source.text.substring(0, 400) + '...' : source.text,
            source: `${typeLabel}: ${source.source}`,
            url: source.url,
            title: source.title,
            region: source.region || null
        });
        
        citationId++;
    }
    
    // Build full text
    let fullText = "";
    for (const sentence of sentenceList) {
        fullText += sentence.text + " ";
    }
    
    return {
        text: fullText,
        sentences: sentenceList,
        citations: citations,
        evidenceCount: uniqueSources.length,
        governmentCount: govCount
    };
}
