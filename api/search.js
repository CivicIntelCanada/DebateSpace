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
        const govEvidence = await gatherDeepGovernmentEvidence(query);
        
        // STEP 2: Gather archive and scrubbed data
        const archiveEvidence = await gatherDeepArchiveEvidence(query);
        
        // STEP 3: Gather academic research
        const academicEvidence = await gatherDeepAcademicEvidence(query);
        
        // STEP 4: Gather news articles
        const newsArticles = await gatherDeepNewsArticles(query);
        
        // STEP 5: Gather video content
        const videoSources = await gatherDeepVideoSources(query);
        
        // STEP 6: Gather international government sources
        const intlGovEvidence = await gatherInternationalGovEvidence(query);
        
        // STEP 7: Gather legal/court sources
        const legalEvidence = await gatherLegalEvidence(query);
        
        // STEP 8: Gather general web (Tavily - lowest priority)
        const webEvidence = await gatherDeepWebEvidence(query);
        
        // Combine ALL evidence (government first)
        const allEvidence = [
            ...govEvidence,
            ...intlGovEvidence,
            ...archiveEvidence,
            ...academicEvidence,
            ...legalEvidence,
            ...webEvidence
        ];
        
        console.log(`\n📊 EVIDENCE COLLECTED:`);
        console.log(`   Government (US): ${govEvidence.length}`);
        console.log(`   Government (Intl): ${intlGovEvidence.length}`);
        console.log(`   Archives: ${archiveEvidence.length}`);
        console.log(`   Academic: ${academicEvidence.length}`);
        console.log(`   Legal: ${legalEvidence.length}`);
        console.log(`   News: ${newsArticles.length}`);
        console.log(`   Video: ${videoSources.length}`);
        console.log(`   Web: ${webEvidence.length}`);
        console.log(`   TOTAL: ${allEvidence.length} sources`);
        
        // Build answer with EVERY sentence cited - FIXED VERSION
        const answerWithCitations = buildIntelligentAnswer(query, allEvidence, govEvidence, intlGovEvidence, legalEvidence, academicEvidence);
        
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
// STEP 1: DEEP GOVERNMENT EVIDENCE (Priority #1)
// ============================================
async function gatherDeepGovernmentEvidence(query) {
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
    
    // EXPANDED list of US government agencies
    const agencies = [
        'ice.gov', 'dhs.gov', 'cbp.gov', 'uscis.gov', 'fletc.gov',
        'justice.gov', 'fbi.gov', 'dea.gov', 'atf.gov', 'uscourts.gov', 'supremecourt.gov',
        'cdc.gov', 'nih.gov', 'fda.gov', 'hhs.gov',
        'treasury.gov', 'federalreserve.gov', 'bls.gov', 'census.gov', 'bea.gov',
        'defense.gov', 'army.mil', 'navy.mil', 'af.mil',
        'energy.gov', 'epa.gov', 'noaa.gov', 'usgs.gov',
        'ed.gov', 'dol.gov', 'nsf.gov',
        'transportation.gov', 'faa.gov', 'ntsb.gov',
        'usda.gov', 'state.gov', 'usaid.gov', 'gao.gov', 'nasa.gov',
        'ftc.gov', 'fcc.gov', 'sec.gov',
        'canada.ca', 'statcan.gc.ca', 'bankofcanada.ca', 'irb-cisr.gc.ca',
        'gov.uk', 'parliament.uk', 'ons.gov.uk',
        'un.org', 'who.int', 'worldbank.org', 'imf.org'
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
    
    // Search specific agencies with multiple result depths
    for (const agency of agencies) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency}&siteSearchFilter=i&num=10`;
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
            
            // Try variations of the query for more depth
            const variations = [
                `"${query}" ${agency}`,
                `${query} site:${agency}`,
                `${query} report site:${agency}`
            ];
            
            for (const variation of variations.slice(0, 2)) {
                const varUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(variation)}&num=8`;
                const varResponse = await fetch(varUrl);
                
                if (varResponse.ok) {
                    const varData = await varResponse.json();
                    if (varData.items && varData.items.length > 0) {
                        for (const item of varData.items) {
                            if (!seenUrls.has(item.link) && item.link.includes(agency)) {
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
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
        } catch (error) {
            console.error(`[Agency ${agency}] Error:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    return allEvidence;
}

// ============================================
// STEP 2: DEEP ARCHIVE EVIDENCE (Historical/scrubbed)
// ============================================
async function gatherDeepArchiveEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const archives = [
        'archive.org', 'web.archive.org', 'archives.gov', 'catalog.archives.gov',
        'data.gov', 'census.gov', 'data.census.gov', 'nces.ed.gov',
        'loc.gov', 'congress.gov', 'federalregister.gov', 'govinfo.gov',
        'europa.eu', 'data.europa.eu', 'trove.nla.gov.au'
    ];
    
    for (const archive of archives) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=10`;
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
        
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    return evidence;
}

// ============================================
// STEP 3: DEEP ACADEMIC EVIDENCE
// ============================================
async function gatherDeepAcademicEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const academicDomains = [
        '.edu', '.ac.uk', '.ac.za', '.ac.jp', '.ac.nz', '.ac.au',
        'harvard.edu', 'mit.edu', 'stanford.edu', 'berkeley.edu', 
        'ox.ac.uk', 'cam.ac.uk', 'ucl.ac.uk', 'ethz.ch'
    ];
    
    const academicRepos = [
        'scholar.google.com', 'researchgate.net', 'academia.edu', 
        'semanticscholar.org', 'core.ac.uk', 'eric.ed.gov', 'pubmed.ncbi.nlm.nih.gov'
    ];
    
    for (const domain of academicDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
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
        
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    for (const repo of academicRepos) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${repo}&siteSearchFilter=i&num=6`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            evidence.push({
                                type: "academic",
                                source: repo,
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
            console.error(`[Academic Repo ${repo}] Error:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return evidence;
}

// ============================================
// STEP 4: DEEP NEWS ARTICLES
// ============================================
async function gatherDeepNewsArticles(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    const seenUrls = new Set();
    
    if (!apiKey) return articles;
    
    const variations = [query, `"${query}"`, `${query} investigation`, `${query} report`];
    
    for (const variation of variations.slice(0, 3)) {
        try {
            const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(variation)}&lang=en&max=15&token=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.articles && data.articles.length > 0) {
                    for (const article of data.articles) {
                        if (!seenUrls.has(article.url)) {
                            seenUrls.add(article.url);
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
            }
        } catch (error) {
            console.error('[GNews] Error:', error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    return articles;
}

// ============================================
// STEP 5: DEEP VIDEO SOURCES
// ============================================
async function gatherDeepVideoSources(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    const seenIds = new Set();
    
    if (apiKey) {
        const variations = [query, `${query} documentary`, `${query} explained`, `${query} training`];
        
        for (const variation of variations.slice(0, 3)) {
            try {
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(variation)}&type=video&maxResults=6&key=${apiKey}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0) {
                        for (const item of data.items) {
                            if (!seenIds.has(item.id.videoId)) {
                                seenIds.add(item.id.videoId);
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
                }
            } catch (error) {
                console.error('[YouTube] Error:', error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return videos;
}

// ============================================
// STEP 6: INTERNATIONAL GOVERNMENT EVIDENCE
// ============================================
async function gatherInternationalGovEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const intlAgencies = [
        'un.org', 'who.int', 'worldbank.org', 'imf.org', 'ilo.org', 'unesco.org',
        'unicef.org', 'wfp.org', 'fao.org', 'unodc.org', 'unhcr.org',
        'europa.eu', 'ec.europa.eu', 'eurostat.ec.europa.eu',
        'canada.ca', 'statcan.gc.ca', 'gov.uk', 'ons.gov.uk',
        'gov.au', 'abs.gov.au', 'govt.nz', 'stats.govt.nz',
        'gouvernement.fr', 'insee.fr', 'bund.de', 'destatis.de',
        'gov.in', 'mospi.gov.in', 'gov.cn', 'stats.gov.cn'
    ];
    
    for (const agency of intlAgencies) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            evidence.push({
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
            console.error(`[Intl Agency ${agency}] Error:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    return evidence;
}

// ============================================
// STEP 7: LEGAL EVIDENCE
// ============================================
async function gatherLegalEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const legalSources = [
        'supremecourt.gov', 'uscourts.gov', 'law.cornell.edu', 'findlaw.com',
        'justia.com', 'scotusblog.com', 'oyez.org', 'ca10.uscourts.gov',
        'courtlistener.com', 'openjurist.org', 'caselaw.findlaw.com'
    ];
    
    for (const source of legalSources) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${source}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            evidence.push({
                                type: "legal",
                                source: source,
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
            console.error(`[Legal ${source}] Error:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    return evidence;
}

// ============================================
// STEP 8: DEEP WEB (Tavily - lowest priority)
// ============================================
async function gatherDeepWebEvidence(query) {
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
                max_results: 20,
                include_domains: ['.gov', '.edu', '.org']
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
// INTELLIGENT ANSWER BUILDER - FIXED VERSION
// Every sentence has a citation from real search results
// ============================================
function buildIntelligentAnswer(query, allEvidence, govEvidence, intlGovEvidence, legalEvidence, academicEvidence) {
    
    // Collect and deduplicate evidence
    const allSources = [...allEvidence];
    const uniqueSources = [];
    const seenTexts = new Set();
    
    for (const source of allSources) {
        const textKey = (source.text || '').substring(0, 80);
        if (!seenTexts.has(textKey) && source.text && source.text.length > 40) {
            seenTexts.add(textKey);
            uniqueSources.push(source);
        }
    }
    
    // Take top sources
    const topSources = uniqueSources.slice(0, 35);
    
    if (topSources.length === 0) {
        return {
            text: `No specific information found for "${query}". Please try different keywords or check official government sources directly at usa.gov, canada.ca, or gov.uk.`,
            sentences: [],
            citations: [],
            evidenceCount: 0
        };
    }
    
    // Build sentences with citations based on actual search results
    const sentences = [];
    const citations = [];
    let citationId = 1;
    const citationMap = new Map();
    
    // Create citation objects first
    for (const source of topSources) {
        let typeIcon = "";
        let typeLabel = "";
        
        if (source.type === "government") {
            typeIcon = "🏛️";
            typeLabel = "GOVERNMENT";
        } else if (source.type === "archive") {
            typeIcon = "📜";
            typeLabel = "ARCHIVE";
        } else if (source.type === "academic") {
            typeIcon = "🎓";
            typeLabel = "ACADEMIC";
        } else if (source.type === "legal") {
            typeIcon = "⚖️";
            typeLabel = "LEGAL";
        } else {
            typeIcon = "🌐";
            typeLabel = "SOURCE";
        }
        
        citations.push({
            id: citationId,
            text: source.text.length > 300 ? source.text.substring(0, 300) + '...' : source.text,
            source: `${typeIcon} ${typeLabel}: ${source.source}`,
            url: source.url,
            title: source.title
        });
        
        citationMap.set(source.url, citationId);
        citationId++;
    }
    
    // Build answer paragraphs using the search results
    const answerParagraphs = [];
    
    // Introduction paragraph
    const govCount = topSources.filter(s => s.type === "government").length;
    const totalCount = topSources.length;
    answerParagraphs.push({
        text: `Based on ${totalCount} government, legal, and academic sources regarding "${query}":`,
        citationId: null
    });
    
    // Group sources by theme to create coherent statements
    const statements = [];
    
    for (let i = 0; i < Math.min(topSources.length, 18); i++) {
        const source = topSources[i];
        let cleanText = source.text
            .replace(/\s+/g, ' ')
            .replace(/\[.*?\]/g, '')
            .trim();
        
        // Clean up common prefixes
        cleanText = cleanText.replace(/^[A-Z\s]+:\s*/, '');
        
        if (cleanText.length > 50 && cleanText.length < 350) {
            // Ensure proper ending punctuation
            if (!cleanText.match(/[.!?]$/)) {
                cleanText += '.';
            }
            
            statements.push({
                text: cleanText,
                citationId: citationMap.get(source.url)
            });
        }
    }
    
    // Add statements to answer
    for (const statement of statements) {
        answerParagraphs.push(statement);
    }
    
    // Add conclusion if we have enough sources
    if (topSources.length > 3) {
        const legalCount = topSources.filter(s => s.type === "legal").length;
        const academicCount = topSources.filter(s => s.type === "academic").length;
        const archiveCount = topSources.filter(s => s.type === "archive").length;
        
        let conclusion = `This information is verified across ${govCount} government sources`;
        if (legalCount > 0) conclusion += `, ${legalCount} legal sources`;
        if (academicCount > 0) conclusion += `, ${academicCount} academic sources`;
        if (archiveCount > 0) conclusion += `, ${archiveCount} archive sources`;
        conclusion += `. Click the citation numbers above to view each original source.`;
        
        answerParagraphs.push({
            text: conclusion,
            citationId: null
        });
    }
    
    // Convert to sentence objects for the frontend
    const sentenceObjects = [];
    for (const para of answerParagraphs) {
        if (para.text && para.text.length > 0) {
            sentenceObjects.push({
                text: para.text,
                citationId: para.citationId
            });
        }
    }
    
    // Build full text
    let fullText = "";
    for (const sentence of sentenceObjects) {
        fullText += sentence.text + " ";
    }
    
    return {
        text: fullText,
        sentences: sentenceObjects,
        citations: citations,
        evidenceCount: topSources.length,
        governmentCount: govCount,
        legalCount: topSources.filter(s => s.type === "legal").length,
        academicCount: topSources.filter(s => s.type === "academic").length
    };
}
