// ============================================
// DEBATESPACE - TRUE DEEP RESEARCH DISCOVERY
// No hardcoded answers - discovers truth through multi-layer research
// Searches: Government Archives + Official Data + Scrubbed Content + Academic Research
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 DEEP RESEARCH DISCOVERY: "${query}"`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    try {
        // LAYER 1: GOVERNMENT ARCHIVES (Deepest - includes scrubbed/historical data)
        console.log(`\n📁 LAYER 1: Government Archives & Historical Data...`);
        const archiveSources = await searchGovernmentArchives(query);
        
        // LAYER 2: OFFICIAL GOVERNMENT SITES (Current data)
        console.log(`\n🏛️ LAYER 2: Official Government Sites...`);
        const govSources = await searchOfficialGovernment(query);
        
        // LAYER 3: ACADEMIC & RESEARCH (University studies)
        console.log(`\n🎓 LAYER 3: Academic Research...`);
        const academicSources = await searchAcademicResearch(query);
        
        // LAYER 4: NEWS & MEDIA (Current events)
        console.log(`\n📰 LAYER 4: News & Media...`);
        const newsSources = await searchNewsMedia(query);
        
        // LAYER 5: GENERAL WEB (Tavily - broad search)
        console.log(`\n🌐 LAYER 5: General Web Search...`);
        const webSources = await searchGeneralWeb(query);
        
        // LAYER 6: VIDEO CONTENT
        console.log(`\n📺 LAYER 6: Video Content...`);
        const videoSources = await searchVideoContent(query);
        
        // Combine ALL sources
        const allSources = [...archiveSources, ...govSources, ...academicSources, ...newsSources, ...webSources];
        
        console.log(`\n📊 RESEARCH COMPLETE:`);
        console.log(`   Archives: ${archiveSources.length}`);
        console.log(`   Government: ${govSources.length}`);
        console.log(`   Academic: ${academicSources.length}`);
        console.log(`   News: ${newsSources.length}`);
        console.log(`   Web: ${webSources.length}`);
        console.log(`   Videos: ${videoSources.length}`);
        console.log(`   TOTAL: ${allSources.length} sources`);
        
        // Analyze and synthesize findings
        const research = await synthesizeResearch(query, allSources, {
            archives: archiveSources,
            government: govSources,
            academic: academicSources
        });
        
        return res.status(200).json({
            success: true,
            query: query,
            research: research,
            youtube: videoSources,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: {
                summary: `Research results for "${query}".`,
                keyFindings: [],
                citations: []
            },
            youtube: getYouTubeFallback(query)
        });
    }
}

// ============================================
// LAYER 1: GOVERNMENT ARCHIVES (Deep historical, scrubbed data)
// ============================================
async function searchGovernmentArchives(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    // Archive-specific domains and search terms
    const archiveDomains = [
        { domain: "archive.org", name: "Internet Archive", type: "digital archive" },
        { domain: "census.gov", name: "US Census Bureau", type: "historical data" },
        { domain: "archives.gov", name: "US National Archives", type: "government records" },
        { domain: "statcan.gc.ca", name: "Statistics Canada", type: "historical data" },
        { domain: "data.gov", name: "US Government Data", type: "open data" },
        { domain: "federalregister.gov", name: "Federal Register", type: "official records" },
        { domain: "govinfo.gov", name: "GovInfo", type: "government documents" },
        { domain: "library of congress", name: "Library of Congress", type: "archives" }
    ];
    
    // Archive-specific search terms to dig deeper
    const archiveTerms = ['history', 'record', 'document', 'archive', 'original', 'source', 'data', 'statistics', 'report'];
    
    for (const archive of archiveDomains) {
        try {
            // Search with archive focus
            const archiveQuery = `${query} ${archiveTerms.join(' OR ')}`;
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(archiveQuery)}&siteSearch=${archive.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            sources.push({
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: archive.name,
                                type: "archive",
                                layer: 1
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Archive ${archive.name}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 2: OFFICIAL GOVERNMENT SITES
// ============================================
async function searchOfficialGovernment(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const govAgencies = [
        { domain: "fletc.gov", name: "FLETC", country: "USA" },
        { domain: "ice.gov", name: "ICE", country: "USA" },
        { domain: "dhs.gov", name: "DHS", country: "USA" },
        { domain: "justice.gov", name: "DOJ", country: "USA" },
        { domain: "bls.gov", name: "BLS", country: "USA" },
        { domain: "federalreserve.gov", name: "Federal Reserve", country: "USA" },
        { domain: "canada.ca", name: "Government of Canada", country: "Canada" },
        { domain: "statcan.gc.ca", name: "Statistics Canada", country: "Canada" },
        { domain: "bankofcanada.ca", name: "Bank of Canada", country: "Canada" },
        { domain: "gov.uk", name: "GOV.UK", country: "UK" },
        { domain: "parliament.uk", name: "UK Parliament", country: "UK" },
        { domain: "un.org", name: "United Nations", country: "International" },
        { domain: "who.int", name: "WHO", country: "International" }
    ];
    
    for (const agency of govAgencies) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            sources.push({
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: `${agency.name} (${agency.country})`,
                                type: "government",
                                layer: 2
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Gov ${agency.name}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 3: ACADEMIC RESEARCH
// ============================================
async function searchAcademicResearch(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const academicDomains = [
        '.edu', '.ac.uk', '.edu.au', '.ac.nz', '.edu.cn',
        'scholar.google.com', 'researchgate.net', 'academia.edu',
        'jstor.org', 'springer.com', 'sciencedirect.com'
    ];
    
    for (const domain of academicDomains) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
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
                            
                            sources.push({
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: siteName,
                                type: "academic",
                                layer: 3
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Academic ${domain}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 4: NEWS & MEDIA
// ============================================
async function searchNewsMedia(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const sources = [];
    
    if (!apiKey) return sources;
    
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
                    
                    sources.push({
                        title: article.title,
                        url: article.url,
                        snippet: article.description,
                        source: siteName,
                        type: "news",
                        layer: 4,
                        date: article.publishedAt?.split('T')[0]
                    });
                }
            }
        }
    } catch (error) {
        console.error('[GNews] Error:', error.message);
    }
    
    return sources;
}

// ============================================
// LAYER 5: GENERAL WEB (Tavily)
// ============================================
async function searchGeneralWeb(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const sources = [];
    
    if (!apiKey) return sources;
    
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'advanced',
                include_answer: true,
                max_results: 20
            })
        });
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            for (const result of data.results) {
                let siteName = "";
                try {
                    siteName = new URL(result.url).hostname.replace('www.', '');
                } catch(e) {}
                
                sources.push({
                    title: result.title,
                    url: result.url,
                    snippet: result.content?.substring(0, 500),
                    source: siteName,
                    type: "web",
                    layer: 5
                });
            }
        }
        
        return sources;
        
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
        return sources;
    }
}

// ============================================
// LAYER 6: VIDEO CONTENT
// ============================================
async function searchVideoContent(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    // Always include YouTube search links
    videos.push(...getYouTubeSearchLinks(query));
    
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
    
    // Remove duplicates
    const uniqueVideos = [];
    const seenUrls = new Set();
    for (const video of videos) {
        if (!seenUrls.has(video.url)) {
            seenUrls.add(video.url);
            uniqueVideos.push(video);
        }
    }
    
    return uniqueVideos.slice(0, 8);
}

function getYouTubeSearchLinks(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `🔍 YouTube Search: "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube", thumbnail: "", type: "search" },
        { title: `📚 "${query}" - Educational`, url: `https://www.youtube.com/results?search_query=${encoded}+educational`, channel: "YouTube", thumbnail: "", type: "search" },
        { title: `📰 "${query}" - News`, url: `https://www.youtube.com/results?search_query=${encoded}+news`, channel: "YouTube", thumbnail: "", type: "search" },
        { title: `🎓 "${query}" - Documentary`, url: `https://www.youtube.com/results?search_query=${encoded}+documentary`, channel: "YouTube", thumbnail: "", type: "search" }
    ];
}

function getYouTubeFallback(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `🔍 YouTube Search: "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube", thumbnail: "", type: "search" }
    ];
}

// ============================================
// SYNTHESIZE RESEARCH - DISCOVERS TRUTH
// ============================================
async function synthesizeResearch(query, allSources, categorizedSources) {
    const groqKey = process.env.GROQ_API_KEY;
    const citations = [];
    const keyFindings = [];
    let summary = "";
    
    // Build citations from ALL sources (prioritize archives and government)
    const prioritizedSources = [...categorizedSources.archives, ...categorizedSources.government, ...allSources];
    
    for (const source of prioritizedSources.slice(0, 25)) {
        if (source.url && source.snippet) {
            let typeLabel = "";
            if (source.type === "archive") typeLabel = "📜 ARCHIVE";
            else if (source.type === "government") typeLabel = "🏛️ GOVERNMENT";
            else if (source.type === "academic") typeLabel = "🎓 ACADEMIC";
            else if (source.type === "news") typeLabel = "📰 NEWS";
            else typeLabel = "🌐 SOURCE";
            
            citations.push({
                text: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                source: `${typeLabel}: ${source.source}`,
                url: source.url,
                layer: source.layer
            });
        }
    }
    
    // Extract key findings - look for specific data points
    for (const source of categorizedSources.government.slice(0, 10)) {
        if (source.snippet) {
            // Look for sentences with numbers, dates, or specific claims
            const sentences = source.snippet.split(/[.!?]+/);
            for (const sentence of sentences) {
                if (sentence.length > 30 && sentence.length < 200) {
                    if (sentence.match(/\d+/) || sentence.match(/week|month|year|percent|%|training|agent|officer/i)) {
                        keyFindings.push(sentence.trim() + '.');
                        break;
                    }
                }
            }
        }
    }
    
    // Use AI to synthesize findings (without hardcoding)
    if (groqKey && allSources.length > 0) {
        try {
            const sourcesText = allSources.slice(0, 20).map(s => `[${s.type.toUpperCase()}] ${s.snippet}`).join('\n\n');
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
                            content: `You are a fact-finding research analyst. Analyze the provided sources and create a factual summary. 
                            
Rules:
1. DO NOT include phrases like "200-300 words" or "summary"
2. ONLY use information found in the sources
3. Include specific numbers, dates, and facts
4. If sources conflict, note the discrepancy
5. Be neutral and objective

Focus on extracting the actual facts from the source material.`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nNumber of sources: ${allSources.length}\n\nArchive sources: ${categorizedSources.archives.length}\nGovernment sources: ${categorizedSources.government.length}\nAcademic sources: ${categorizedSources.academic.length}\n\nSource Content:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1200
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                summary = data.choices?.[0]?.message?.content || `Research findings for "${query}".`;
                
                // Clean up any remaining labels
                summary = summary.replace(/\d{3}-\d{3}\s*words?/gi, '');
                summary = summary.replace(/Comprehensive Summary:?/gi, '');
                summary = summary.replace(/Detailed Analysis:?/gi, '');
                summary = summary.trim();
            } else {
                summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
            }
        } catch (error) {
            summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
        }
    } else {
        summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
    }
    
    // Remove duplicate key findings
    const uniqueFindings = [];
    for (const finding of keyFindings) {
        if (!uniqueFindings.some(f => f === finding)) {
            uniqueFindings.push(finding);
        }
    }
    
    return {
        summary: summary,
        keyFindings: uniqueFindings.slice(0, 12),
        citations: citations,
        sourceBreakdown: {
            archives: categorizedSources.archives.length,
            government: categorizedSources.government.length,
            academic: categorizedSources.academic.length,
            total: allSources.length
        }
    };
}
