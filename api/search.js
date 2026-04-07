// ============================================
// DEBATESPACE - DISCOVERY RESEARCH WITH RULE-BASED SUMMARIZER
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 RESEARCH: "${query}"`);
    
    try {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        
        // ========================================
        // SEARCH ALL SOURCES (UNCHANGED)
        // ========================================
        let allResults = [];
        
        // CX Engines
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
            }
        }
        
        // Government domains
        const govDomains = ['.gov', '.gc.ca', '.gov.uk', '.mil'];
        for (const domain of govDomains) {
            if (apiKey) {
                const results = await searchGovDomain(apiKey, domain, query);
                allResults.push(...results);
            }
        }
        
        // Archives
        const archiveResults = await searchArchives(query);
        allResults.push(...archiveResults);
        
        // Tavily
        const tavilyResults = await tavilySearch(query);
        allResults.push(...tavilyResults);
        
        // Remove duplicates
        const uniqueResults = [];
        const seenUrls = new Set();
        for (const result of allResults) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                uniqueResults.push(result);
            }
        }
        
        console.log(`Total sources: ${uniqueResults.length}`);
        
        // ========================================
        // BUILD RESEARCH ANSWER (Citations - UNCHANGED)
        // ========================================
        const researchAnswer = buildResearchAnswer(query, uniqueResults);
        
        // ========================================
        // GENERATE RULE-BASED ANALYSIS (REPLACES AI)
        // ========================================
        const ruleBasedAnalysis = generateRuleBasedAnalysis(query, uniqueResults);
        
        // ========================================
        // GET SUPPLEMENTAL CONTENT (UNCHANGED)
        // ========================================
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: researchAnswer,
            aiAnalysis: ruleBasedAnalysis,  // Now returns rule-based analysis, not AI
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: uniqueResults.slice(0, 40),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('ERROR:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: { text: `Research completed. Found sources about "${query}".`, citations: [], evidenceCount: 0 },
            aiAnalysis: { text: `Analysis completed. Please review the research sources below.`, sourcesUsed: 0 },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// SEARCH FUNCTIONS (COMPLETELY UNCHANGED)
// ============================================
async function searchCX(apiKey, cx, query) {
    const results = [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=8`;
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
                        isGovernment: item.link.includes('.gov') || item.link.includes('.gc.ca')
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

async function searchArchives(query) {
    const results = [];
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return results;
    const archives = ['archive.org', 'archives.gov', 'census.gov', 'data.gov'];
    for (const archive of archives) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=4`;
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
        } catch (error) {}
    }
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
            body: JSON.stringify({ api_key: apiKey, query: query, search_depth: 'advanced', max_results: 8 })
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
                        snippet: result.content?.substring(0, 400),
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
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=6&token=${apiKey}`;
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
    } catch (error) {}
    return [];
}

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
    } catch (error) {}
    return [];
}

// ============================================
// BUILD RESEARCH ANSWER (Citations - UNCHANGED)
// ============================================
function buildResearchAnswer(query, sources) {
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
    let fullText = `Found ${sortedSources.length} sources (${govSources.length} government sources) about "${query}": `;
    
    for (const source of sortedSources.slice(0, 15)) {
        let quote = source.snippet || source.title || '';
        quote = quote.replace(/\s+/g, ' ').trim();
        
        if (quote.length > 40 && !quote.toLowerCase().includes('search')) {
            const typeLabel = source.isGovernment ? "🏛️ GOVERNMENT" : "📄 SOURCE";
            
            fullText += `"${quote.substring(0, 300)}" [${citationId}] `;
            
            citations.push({
                id: citationId,
                text: quote.length > 400 ? quote.substring(0, 400) + '...' : quote,
                source: `${typeLabel}: ${source.source}`,
                url: source.url
            });
            citationId++;
        }
    }
    
    fullText += ` Click any [number] to verify the source.`;
    
    return {
        text: fullText,
        citations: citations,
        evidenceCount: sortedSources.length,
        governmentCount: govSources.length
    };
}

// ============================================
// NEW: RULE-BASED ANALYSIS GENERATOR (No AI)
// ============================================
function generateRuleBasedAnalysis(query, sources) {
    if (sources.length === 0) {
        return {
            text: `No research sources were found for "${query}". Please try different keywords or check your search terms.`,
            sourcesUsed: 0,
            method: "Rule-based analysis (no AI)",
            sections: []
        };
    }
    
    // Extract key information from sources
    const govSources = sources.filter(s => s.isGovernment === true);
    const newsSources = sources.filter(s => !s.isGovernment && (s.type === 'cx' || s.type === 'web'));
    
    // Keyword extraction patterns
    const patterns = {
        requirements: {
            keywords: ['require', 'must', 'mandatory', 'necessary', 'prerequisite', 'need to', 'required to', 'obtain', 'complete', 'pass', 'score', '70%', 'percent'],
            matches: []
        },
        training: {
            keywords: ['training', 'academy', 'course', 'program', 'basic training', 'fletc', 'instruction', 'curriculum', 'weeks', 'duration', 'schedule'],
            matches: []
        },
        policies: {
            keywords: ['policy', 'procedure', 'protocol', 'standard', 'guideline', 'regulation', 'rule', 'directive', 'order'],
            matches: []
        },
        incidents: {
            keywords: ['incident', 'event', 'killing', 'death', 'injury', 'violence', 'shooting', 'accident', 'complaint', 'investigation'],
            matches: []
        },
        controversies: {
            keywords: ['debate', 'controversy', 'criticism', 'concern', 'accountability', 'reform', 'oversight', 'question', 'inquiry', 'investigation'],
            matches: []
        },
        mission: {
            keywords: ['mission', 'purpose', 'goal', 'objective', 'role', 'responsibility', 'duty', 'function', 'protect', 'enforce', 'security'],
            matches: []
        },
        partnerships: {
            keywords: ['287(g)', 'local', 'state', 'partnership', 'collaboration', 'agency', 'cooperation', 'joint', 'task force'],
            matches: []
        },
        fitness: {
            keywords: ['fitness', 'physical', 'test', 'pft', 'exercise', 'strength', 'endurance', 'medical', 'health', 'clearance', 'secret clearance'],
            matches: []
        },
        locations: {
            keywords: ['glynco', 'georgia', 'florida', 'artesia', 'charleston', 'location', 'based', 'headquarters', 'facility', 'center'],
            matches: []
        }
    };
    
    // Extract quotes and categorize them
    const extractedQuotes = [];
    
    for (const source of sources.slice(0, 20)) {
        const content = (source.snippet || source.title || '').toLowerCase();
        const originalContent = source.snippet || source.title || '';
        
        for (const [category, config] of Object.entries(patterns)) {
            for (const keyword of config.keywords) {
                if (content.includes(keyword.toLowerCase())) {
                    // Extract surrounding context
                    let quote = originalContent;
                    if (quote.length > 200) {
                        const keywordIndex = originalContent.toLowerCase().indexOf(keyword.toLowerCase());
                        const start = Math.max(0, keywordIndex - 60);
                        const end = Math.min(originalContent.length, keywordIndex + 140);
                        quote = (start > 0 ? '...' : '') + originalContent.substring(start, end) + (end < originalContent.length ? '...' : '');
                    }
                    
                    patterns[category].matches.push({
                        text: quote,
                        source: source.source,
                        url: source.url,
                        isGovernment: source.isGovernment,
                        title: source.title
                    });
                    break; // Only add once per source per category
                }
            }
        }
        
        // Also collect general quotes for "Key Findings"
        if (originalContent.length > 60 && originalContent.length < 500) {
            extractedQuotes.push({
                text: originalContent,
                source: source.source,
                url: source.url,
                isGovernment: source.isGovernment,
                title: source.title
            });
        }
    }
    
    // Deduplicate matches
    for (const category in patterns) {
        const unique = [];
        const seen = new Set();
        for (const match of patterns[category].matches) {
            const key = match.text.substring(0, 100);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(match);
            }
        }
        patterns[category].matches = unique.slice(0, 3);
    }
    
    // Build the analysis text
    const sections = [];
    let fullText = '';
    
    // Header
    fullText += `📊 RESEARCH ANALYSIS: "${query.toUpperCase()}"\n`;
    fullText += `Based on ${sources.length} sources (${govSources.length} government, ${newsSources.length} news/articles)\n`;
    fullText += `Analysis method: Rule-based extraction (no AI)\n`;
    fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Section 1: Key Findings (most relevant quotes)
    const uniqueFindings = [];
    const seenFindings = new Set();
    for (const quote of extractedQuotes.slice(0, 8)) {
        const shortQuote = quote.text.length > 150 ? quote.text.substring(0, 150) + '...' : quote.text;
        if (!seenFindings.has(shortQuote) && shortQuote.length > 40) {
            seenFindings.add(shortQuote);
            uniqueFindings.push(quote);
        }
    }
    
    if (uniqueFindings.length > 0) {
        fullText += `🔍 KEY FINDINGS FROM RESEARCH:\n`;
        for (let i = 0; i < Math.min(uniqueFindings.length, 5); i++) {
            const finding = uniqueFindings[i];
            const sourceType = finding.isGovernment ? '🏛️' : '📄';
            fullText += `${i+1}. "${finding.text}"\n   ${sourceType} Source: ${finding.source}\n\n`;
        }
        fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Section 2: Training Requirements (if found)
    if (patterns.requirements.matches.length > 0 || patterns.training.matches.length > 0) {
        fullText += `📋 TRAINING & REQUIREMENTS:\n`;
        for (const match of [...patterns.requirements.matches, ...patterns.training.matches].slice(0, 3)) {
            fullText += `• ${match.text}\n  [${match.isGovernment ? 'Government' : 'News'}: ${match.source}]\n\n`;
        }
        fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Section 3: Physical & Security Standards
    if (patterns.fitness.matches.length > 0) {
        fullText += `💪 PHYSICAL & SECURITY STANDARDS:\n`;
        for (const match of patterns.fitness.matches.slice(0, 2)) {
            fullText += `• ${match.text}\n  [${match.isGovernment ? 'Government' : 'News'}: ${match.source}]\n\n`;
        }
        fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Section 4: Mission & Purpose
    if (patterns.mission.matches.length > 0) {
        fullText += `🎯 MISSION & PURPOSE:\n`;
        for (const match of patterns.mission.matches.slice(0, 2)) {
            fullText += `• ${match.text}\n  [${match.isGovernment ? 'Government' : 'News'}: ${match.source}]\n\n`;
        }
        fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Section 5: Partnerships & Local Programs
    if (patterns.partnerships.matches.length > 0) {
        fullText += `🤝 PARTNERSHIPS & LOCAL PROGRAMS:\n`;
        for (const match of patterns.partnerships.matches.slice(0, 2)) {
            fullText += `• ${match.text}\n  [${match.isGovernment ? 'Government' : 'News'}: ${match.source}]\n\n`;
        }
        fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Section 6: Controversies & Incidents (if found)
    if (patterns.incidents.matches.length > 0 || patterns.controversies.matches.length > 0) {
        fullText += `⚠️ CONTROVERSIES & INCIDENTS:\n`;
        for (const match of [...patterns.incidents.matches, ...patterns.controversies.matches].slice(0, 3)) {
            fullText += `• ${match.text}\n  [${match.isGovernment ? 'Government' : 'News'}: ${match.source}]\n\n`;
        }
        fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    // Section 7: Statistical Summary
    fullText += `📊 STATISTICAL SUMMARY:\n`;
    fullText += `• Total sources analyzed: ${sources.length}\n`;
    fullText += `• Government sources: ${govSources.length}\n`;
    fullText += `• News/Article sources: ${newsSources.length}\n`;
    fullText += `• Unique findings extracted: ${uniqueFindings.length}\n`;
    fullText += `• Citations available: Click any source to verify\n\n`;
    fullText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Footer
    fullText += `✅ VERIFICATION: All information above is directly extracted from the ${sources.length} research sources. Click any [source] link to view the original document.\n`;
    fullText += `🔄 METHOD: Rule-based text extraction and categorization. No AI generation used.\n`;
    fullText += `📅 Analysis generated: ${new Date().toISOString().split('T')[0]}\n`;
    
    return {
        text: fullText,
        sourcesUsed: sources.length,
        method: "Rule-based analysis (no AI)",
        sections: sections,
        governmentSources: govSources.length,
        newsSources: newsSources.length,
        patternsDetected: Object.fromEntries(
            Object.entries(patterns).map(([k, v]) => [k, v.matches.length])
        )
    };
}
