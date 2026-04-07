// ============================================
// DEBATESPACE - DEEP RESEARCH API
// Same perfect output format. Massive research depth.
// Priority: Gov > Archives > Scrubbed > CX > Academic
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔬 DEEP RESEARCH: "${query}"`);
    const startTime = Date.now();
    
    try {
        // ========================================
        // PHASE 1: GOVERNMENT SOURCES (PRIORITY)
        // Using ALL your CX keys for different regions
        // ========================================
        console.log('\n📡 PHASE 1: Mining government sources...');
        const govResults = await deepGovernmentSearch(query);
        
        // ========================================
        // PHASE 2: ARCHIVED & SCRUBBED DATA
        // Historical versions, removed content, archives
        // ========================================
        console.log('📜 PHASE 2: Retrieving archived/scrubbed data...');
        const archiveResults = await deepArchiveSearch(query);
        
        // ========================================
        // PHASE 3: REGION-SPECIFIC CX SEARCHES
        // Using NA, ASIA, EU, TT, NEWS keys
        // ========================================
        console.log('🌍 PHASE 3: Regional CX deep dives...');
        const regionalResults = await regionalCXSearch(query);
        
        // ========================================
        // PHASE 4: FULL PAGE CONTENT EXTRACTION
        // Get complete text from best sources
        // ========================================
        console.log('📄 PHASE 4: Extracting full page content...');
        const topSources = [...govResults, ...archiveResults, ...regionalResults].slice(0, 15);
        const fullContentSources = await extractFullContent(topSources);
        
        // ========================================
        // PHASE 5: CROSS-VERIFICATION
        // Facts that appear in multiple sources
        // ========================================
        console.log('✅ PHASE 5: Cross-verifying facts...');
        const verifiedFacts = await crossVerifyFacts(fullContentSources);
        
        // ========================================
        // PHASE 6: STATISTICS & DATA EXTRACTION
        // Numbers, dates, percentages from all sources
        // ========================================
        console.log('📊 PHASE 6: Extracting statistics...');
        const extractedData = extractAllStatistics(fullContentSources);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ DEEP RESEARCH COMPLETE: ${elapsed}s | ${fullContentSources.length} sources | ${verifiedFacts.length} verified facts | ${extractedData.length} data points`);
        
        // ========================================
        // BUILD ANSWER - SAME PERFECT FORMAT
        // But now with DEEP content
        // ========================================
        const answer = buildDeepAnswer(query, fullContentSources, verifiedFacts, extractedData);
        
        // News and videos (for separate display only)
        const newsResults = await searchNewsSources(query);
        const videoResults = await searchVideoSources(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: fullContentSources,
            deepMetrics: {
                sourcesAnalyzed: fullContentSources.length,
                verifiedFacts: verifiedFacts.length,
                dataPointsExtracted: extractedData.length,
                researchTimeSeconds: elapsed
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Research error: ${error.message}. Please try again.`,
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
// DEEP GOVERNMENT SEARCH - ALL DOMAINS, ALL CX KEYS
// ============================================
async function deepGovernmentSearch(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey) return results;
    
    // Comprehensive government domains with specific data paths
    const governmentDomains = [
        // US Federal
        { domain: 'data.gov', region: 'US', type: 'open-data' },
        { domain: 'catalog.data.gov', region: 'US', type: 'dataset' },
        { domain: 'www.bls.gov', region: 'US', type: 'statistics', paths: ['data', 'news.release', 'opub'] },
        { domain: 'www.census.gov', region: 'US', type: 'census', paths: ['data', 'library', 'newsroom'] },
        { domain: 'www.cdc.gov', region: 'US', type: 'health', paths: ['data', 'nchs', 'mmwr'] },
        { domain: 'www.nih.gov', region: 'US', type: 'research' },
        { domain: 'www.ice.gov', region: 'US', type: 'enforcement', paths: ['news', 'statistics', 'documents'] },
        { domain: 'www.dhs.gov', region: 'US', type: 'security', paths: ['data', 'news', 'publications', 'ohss'] },
        { domain: 'www.justice.gov', region: 'US', type: 'legal', paths: ['opa', 'usao', 'criminal', 'ojp'] },
        { domain: 'www.fletc.gov', region: 'US', type: 'training' },
        { domain: 'www.state.gov', region: 'US', type: 'diplomacy', paths: ['reports', 'bureaus'] },
        { domain: 'www.treasury.gov', region: 'US', type: 'finance', paths: ['data', 'reports'] },
        { domain: 'www.gao.gov', region: 'US', type: 'oversight', paths: ['products', 'reports', 'key-issues'] },
        { domain: 'www.congress.gov', region: 'US', type: 'legislative', paths: ['bill', 'congressional-record', 'reports'] },
        { domain: 'www.federalregister.gov', region: 'US', type: 'legal', paths: ['documents', 'agencies'] },
        { domain: 'www.whitehouse.gov', region: 'US', type: 'executive', paths: ['briefing-room', 'statements', 'records'] },
        { domain: 'www.archives.gov', region: 'US', type: 'archive', paths: ['research', 'records'] },
        { domain: 'www.fbi.gov', region: 'US', type: 'law-enforcement', paths: ['news', 'stats-services'] },
        { domain: 'www.uscis.gov', region: 'US', type: 'immigration', paths: ['tools', 'data'] },
        { domain: 'www.epa.gov', region: 'US', type: 'environment', paths: ['data', 'reports'] },
        
        // Canada
        { domain: 'www.canada.ca', region: 'Canada', type: 'government', paths: ['en/immigration-refugees-citizenship', 'en/statistics', 'en/publications', 'en/data'] },
        { domain: 'www.statcan.gc.ca', region: 'Canada', type: 'statistics', paths: ['en/statistical-program', 'en/data'] },
        { domain: 'ouvert.canada.ca', region: 'Canada', type: 'open-data' },
        
        // United Kingdom
        { domain: 'www.gov.uk', region: 'UK', type: 'government', paths: ['government/publications', 'government/statistics', 'government/news', 'data'] },
        { domain: 'www.ons.gov.uk', region: 'UK', type: 'statistics', paths: ['businessindustryandtrade', 'economy', 'peoplepopulationandcommunity'] },
        { domain: 'www.nationalarchives.gov.uk', region: 'UK', type: 'archive' },
        
        // European Union
        { domain: 'ec.europa.eu', region: 'EU', type: 'european', paths: ['eurostat', 'info', 'data'] },
        { domain: 'europa.eu', region: 'EU', type: 'european' },
        { domain: 'www.consilium.europa.eu', region: 'EU', type: 'council' },
        
        // International
        { domain: 'www.who.int', region: 'International', type: 'health', paths: ['data', 'publications', 'newsroom'] },
        { domain: 'www.oecd.org', region: 'International', type: 'economic', paths: ['en/data', 'en/publications'] },
        { domain: 'www.imf.org', region: 'International', type: 'financial', paths: ['en/Data', 'en/Publications'] },
        { domain: 'www.un.org', region: 'International', type: 'united-nations', paths: ['en/sections', 'en/documents'] },
        { domain: 'data.worldbank.org', region: 'International', type: 'development' }
    ];
    
    // Get all CX keys
    const cxNa = process.env.GOOGLE_SEARCH_CX_NA;
    const cxAsia = process.env.GOOGLE_SEARCH_CX_ASIA;
    const cxEu = process.env.GOOGLE_SEARCH_CX_EU;
    const cxTt = process.env.GOOGLE_SEARCH_CX_TT;
    const cxNews = process.env.GOOGLE_SEARCH_CX_NEWS;
    
    // Determine which CX to use based on query
    let activeCx = cxNa;
    const queryLower = query.toLowerCase();
    if (queryLower.includes('asia') || queryLower.includes('china') || queryLower.includes('japan') || queryLower.includes('india')) {
        activeCx = cxAsia || cxNa;
    } else if (queryLower.includes('europe') || queryLower.includes('eu') || queryLower.includes('germany') || queryLower.includes('france')) {
        activeCx = cxEu || cxNa;
    }
    
    // Search each government domain
    for (const gov of governmentDomains) {
        // Try different search approaches
        const searchQueries = [
            `${query} site:${gov.domain}`,
            `${query} site:${gov.domain} data`,
            `${query} site:${gov.domain} statistics report`
        ];
        
        for (const searchQuery of searchQueries.slice(0, 2)) {
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${activeCx}&q=${encodeURIComponent(searchQuery)}&num=5`;
                
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0) {
                        for (const item of data.items) {
                            if (!seenUrls.has(item.link) && item.snippet && item.snippet.length > 50) {
                                seenUrls.add(item.link);
                                results.push({
                                    type: "government",
                                    source: gov.domain,
                                    region: gov.region,
                                    subType: gov.type,
                                    title: item.title,
                                    url: item.link,
                                    snippet: item.snippet,
                                    fullText: null,
                                    relevance: calculateRelevance(item.snippet, query)
                                });
                            }
                        }
                    }
                }
                
                await new Promise(r => setTimeout(r, 80));
                
            } catch (error) {
                // Silent fail per domain
            }
        }
    }
    
    // Sort by relevance and return top results
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 40);
}

// ============================================
// DEEP ARCHIVE SEARCH - WAYBACK & GOVERNMENT ARCHIVES
// ============================================
async function deepArchiveSearch(query) {
    const results = [];
    const seenUrls = new Set();
    
    // Archive sources
    const archiveSources = [
        { name: 'Wayback Machine', url: `https://archive.org/wayback/available?url=${encodeURIComponent(query)}`, type: 'web-archive' },
        { name: 'National Archives', domain: 'archives.gov', search: `https://www.archives.gov/search?query=${encodeURIComponent(query)}` },
        { name: 'UK National Archives', domain: 'nationalarchives.gov.uk' },
        { name: 'Canada Archives', domain: 'bac-lac.gc.ca' }
    ];
    
    // Try Wayback Machine
    try {
        const wbUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(query)}`;
        const response = await fetch(wbUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.archived_snapshots?.closest?.url) {
                results.push({
                    type: "archive",
                    source: "Wayback Machine",
                    region: "Global",
                    title: `Archived: ${query}`,
                    url: data.archived_snapshots.closest.url,
                    snippet: `Historical archived version from ${data.archived_snapshots.closest.timestamp}. This may contain information that has been updated or removed from live sites.`,
                    date: data.archived_snapshots.closest.timestamp
                });
            }
        }
    } catch (e) {
        console.log('Wayback error:', e.message);
    }
    
    // Search government archives
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (apiKey && cx) {
        const archiveDomains = ['archives.gov', 'catalog.archives.gov', 'govinfo.gov', 'fdsys.gov', 'web.archive.org'];
        
        for (const domain of archiveDomains) {
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=3`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.items) {
                        for (const item of data.items) {
                            if (!seenUrls.has(item.link)) {
                                seenUrls.add(item.link);
                                results.push({
                                    type: "archive",
                                    source: domain,
                                    region: "Archive",
                                    title: item.title,
                                    url: item.link,
                                    snippet: item.snippet,
                                    isArchived: true
                                });
                            }
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 80));
            } catch (e) {
                // Silent fail
            }
        }
    }
    
    return results;
}

// ============================================
// REGIONAL CX SEARCH - USING ALL YOUR CX KEYS
// ============================================
async function regionalCXSearch(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const results = [];
    
    if (!apiKey) return results;
    
    const regionalConfigs = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA, region: 'NA' },
        { name: 'Asia', cx: process.env.GOOGLE_SEARCH_CX_ASIA, region: 'Asia' },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU, region: 'EU' },
        { name: 'Global', cx: process.env.GOOGLE_SEARCH_CX_TT, region: 'Global' }
    ];
    
    for (const config of regionalConfigs) {
        if (!config.cx) continue;
        
        try {
            // Search with region-specific CX
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${config.cx}&q=${encodeURIComponent(query)}&num=5`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        // Check if it's a government or authoritative source
                        const isGov = item.link.includes('.gov') || item.link.includes('.gc.ca') || item.link.includes('.gov.uk');
                        results.push({
                            type: isGov ? "government" : "regional",
                            source: new URL(item.link).hostname,
                            region: config.region,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            cxUsed: config.name
                        });
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 100));
            
        } catch (error) {
            console.error(`Regional CX ${config.name} error:`, error.message);
        }
    }
    
    return results;
}

// ============================================
// EXTRACT FULL PAGE CONTENT
// ============================================
async function extractFullContent(sources) {
    const enrichedSources = [];
    
    for (const source of sources) {
        try {
            // Fetch the full page
            const response = await fetch(source.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
                    'Accept': 'text/html'
                }
            });
            
            if (response.ok) {
                const html = await response.text();
                
                // Extract main text content
                let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
                text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
                text = text.replace(/<[^>]+>/g, ' ');
                text = text.replace(/\s+/g, ' ').trim();
                
                // Find the most relevant paragraph (around 1000-3000 chars)
                const sentences = text.split(/[.!?]+/);
                let relevantText = '';
                let keywordCount = 0;
                
                for (const sentence of sentences) {
                    const sentenceLower = sentence.toLowerCase();
                    const queryTerms = source.snippet?.toLowerCase().split(' ') || [];
                    let matches = 0;
                    for (const term of queryTerms.slice(0, 5)) {
                        if (term.length > 3 && sentenceLower.includes(term)) matches++;
                    }
                    if (matches > 0 || sentence.length > 80) {
                        relevantText += sentence + '. ';
                        keywordCount += matches;
                        if (relevantText.length > 2000) break;
                    }
                }
                
                enrichedSources.push({
                    ...source,
                    fullText: relevantText.length > 200 ? relevantText : text.substring(0, 2000),
                    fullTextLength: relevantText.length || text.length,
                    extractedAt: new Date().toISOString()
                });
            } else {
                enrichedSources.push({
                    ...source,
                    fullText: source.snippet,
                    fullTextLength: source.snippet.length
                });
            }
            
            // Be respectful with rate limiting
            await new Promise(r => setTimeout(r, 200));
            
        } catch (error) {
            console.error(`Failed to fetch ${source.url}:`, error.message);
            enrichedSources.push({
                ...source,
                fullText: source.snippet,
                fullTextLength: source.snippet.length
            });
        }
    }
    
    return enrichedSources;
}

// ============================================
// CROSS-VERIFY FACTS ACROSS SOURCES
// ============================================
async function crossVerifyFacts(sources) {
    const factMap = new Map();
    
    for (const source of sources) {
        const text = (source.fullText || source.snippet || '');
        
        // Extract claims (sentences with numbers, dates, or specific claims)
        const sentences = text.split(/[.!?]+/);
        
        for (const sentence of sentences) {
            if (sentence.length < 30 || sentence.length > 300) continue;
            
            // Check if sentence contains factual information
            const hasNumber = /\d{3,}/.test(sentence);
            const hasPercentage = /\d+%/.test(sentence);
            const hasYear = /\b(19|20)\d{2}\b/.test(sentence);
            const hasAgency = /\b(ICE|DHS|FBI|CDC|FDA|EPA|DOJ|BLS|Census|WHO|UN|EU)\b/i.test(sentence);
            
            if (hasNumber || hasPercentage || hasYear || hasAgency) {
                const normalized = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
                
                if (!factMap.has(normalized)) {
                    factMap.set(normalized, []);
                }
                factMap.get(normalized).push({
                    source: source.source,
                    url: source.url,
                    region: source.region,
                    fullSentence: sentence
                });
            }
        }
    }
    
    // Return only facts that appear in multiple sources (verified)
    const verifiedFacts = [];
    for (const [claim, sourcesList] of factMap.entries()) {
        if (sourcesList.length >= 2) {
            verifiedFacts.push({
                claim: sourcesList[0].fullSentence,
                verificationCount: sourcesList.length,
                sources: sourcesList.map(s => ({ url: s.url, name: s.source })),
                confidence: sourcesList.length >= 3 ? 'high' : 'medium'
            });
        }
    }
    
    // Sort by verification count (most verified first)
    return verifiedFacts.sort((a, b) => b.verificationCount - a.verificationCount).slice(0, 20);
}

// ============================================
// EXTRACT ALL STATISTICS FROM SOURCES
// ============================================
function extractAllStatistics(sources) {
    const statistics = [];
    const seenStats = new Set();
    
    const patterns = [
        { name: 'percentage', regex: /(\d+(?:\.\d+)?)\s*%/g },
        { name: 'number', regex: /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g },
        { name: 'year', regex: /\b(19|20)\d{2}\b/g },
        { name: 'currency', regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/g },
        { name: 'date', regex: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi }
    ];
    
    for (const source of sources) {
        const text = source.fullText || source.snippet || '';
        
        for (const pattern of patterns) {
            const matches = text.matchAll(pattern.regex);
            for (const match of matches) {
                const stat = match[0];
                if (!seenStats.has(stat) && stat.length > 1) {
                    seenStats.add(stat);
                    
                    // Get context around the statistic
                    const contextStart = Math.max(0, text.indexOf(stat) - 80);
                    const contextEnd = Math.min(text.length, text.indexOf(stat) + 80);
                    const context = text.substring(contextStart, contextEnd).trim();
                    
                    statistics.push({
                        value: stat,
                        type: pattern.name,
                        source: source.source,
                        url: source.url,
                        context: context.substring(0, 150)
                    });
                }
            }
        }
    }
    
    return statistics.slice(0, 30);
}

// ============================================
// CALCULATE RELEVANCE SCORE
// ============================================
function calculateRelevance(text, query) {
    if (!text) return 0;
    const textLower = text.toLowerCase();
    const queryTerms = query.toLowerCase().split(' ');
    let score = 0;
    
    for (const term of queryTerms) {
        if (term.length > 2) {
            const occurrences = (textLower.match(new RegExp(term, 'g')) || []).length;
            score += occurrences * 2;
        }
    }
    
    // Bonus for numbers/statistics
    if (/\d+/.test(text)) score += 3;
    if (/%/.test(text)) score += 2;
    if (/\b(19|20)\d{2}\b/.test(text)) score += 2;
    
    return Math.min(score, 100);
}

// ============================================
// BUILD DEEP ANSWER - SAME PERFECT FORMAT
// ============================================
function buildDeepAnswer(query, sources, verifiedFacts, statistics) {
    const citations = [];
    const sentenceList = [];
    let citationId = 1;
    
    // Introduction with deep research context
    sentenceList.push({
        text: `DEEP RESEARCH REPORT — Analysis of ${sources.length} government and official sources about "${query}":`,
        citationId: null
    });
    
    // VERIFIED FACTS SECTION (most important)
    if (verifiedFacts.length > 0) {
        sentenceList.push({
            text: `VERIFIED FACTS (appearing in multiple independent sources):`,
            citationId: null
        });
        
        for (const fact of verifiedFacts.slice(0, 8)) {
            sentenceList.push({
                text: `"${fact.claim}" — Verified across ${fact.verificationCount} sources.`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: fact.claim,
                source: `✅ VERIFIED (${fact.verificationCount} sources, ${fact.confidence} confidence)`,
                url: fact.sources[0].url,
                verificationCount: fact.verificationCount
            });
            citationId++;
        }
    }
    
    // KEY STATISTICS SECTION
    if (statistics.length > 0) {
        sentenceList.push({
            text: `KEY STATISTICS EXTRACTED FROM GOVERNMENT DATA:`,
            citationId: null
        });
        
        for (const stat of statistics.slice(0, 10)) {
            sentenceList.push({
                text: `"${stat.value}" — ${stat.type.toUpperCase()} statistic from ${stat.source}.`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: stat.context || stat.value,
                source: `📊 ${stat.type.toUpperCase()}: ${stat.source}`,
                url: stat.url
            });
            citationId++;
        }
    }
    
    // DIRECT QUOTES FROM GOVERNMENT SOURCES
    const govSources = sources.filter(s => s.type === 'government');
    if (govSources.length > 0) {
        sentenceList.push({
            text: `DIRECT QUOTES FROM ${govSources.length} GOVERNMENT SOURCES:`,
            citationId: null
        });
        
        for (const source of govSources.slice(0, 12)) {
            const quoteText = (source.fullText || source.snippet || '').substring(0, 300);
            if (quoteText.length > 60) {
                sentenceList.push({
                    text: `"${quoteText.replace(/\s+/g, ' ').trim()}"`,
                    citationId: citationId
                });
                
                citations.push({
                    id: citationId,
                    text: quoteText.length > 400 ? quoteText.substring(0, 400) + '...' : quoteText,
                    source: `🏛️ ${source.source} (${source.region || 'Government'})`,
                    url: source.url
                });
                citationId++;
            }
        }
    }
    
    // ARCHIVE SOURCES SECTION
    const archiveSources = sources.filter(s => s.type === 'archive');
    if (archiveSources.length > 0) {
        sentenceList.push({
            text: `ARCHIVED & HISTORICAL DATA (may contain information not available on live sites):`,
            citationId: null
        });
        
        for (const source of archiveSources.slice(0, 5)) {
            sentenceList.push({
                text: `"${source.snippet.substring(0, 200)}"`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: source.snippet,
                source: `📜 ARCHIVE: ${source.source}`,
                url: source.url
            });
            citationId++;
        }
    }
    
    // Research summary
    sentenceList.push({
        text: `RESEARCH SUMMARY: ${sources.length} total sources analyzed. ${verifiedFacts.length} facts cross-verified across multiple government sources. ${statistics.length} data points extracted. Each citation contains an exact quote from its source. Click any [number] to verify.`,
        citationId: null
    });
    
    // Build full text
    let fullText = "";
    for (const sentence of sentenceList) {
        fullText += sentence.text + " ";
    }
    
    return {
        text: fullText,
        sentences: sentenceList,
        citations: citations,
        evidenceCount: sources.length,
        governmentCount: govSources.length,
        verifiedFactsCount: verifiedFacts.length,
        dataPointsExtracted: statistics.length
    };
}

// ============================================
// NEWS SOURCES (DISPLAY ONLY - NOT IN ANSWER)
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
                        source: new URL(article.url).hostname,
                        date: article.publishedAt?.split('T')[0],
                        description: article.description
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
// VIDEO SOURCES (DISPLAY ONLY)
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
                        thumbnail: item.snippet.thumbnails?.medium?.url || ''
                    });
                }
            }
        }
    } catch (error) {
        console.error('[YouTube] Error:', error.message);
    }
    
    return videos;
}
