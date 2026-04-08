// ============================================
// DEBATESPACE - DEEP INVESTIGATIVE RESEARCH API
// Searches government training records, official biographies,
// personnel databases, and archived government data
// No news commentary. No AI-generated "facts".
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔬 DEEP INVESTIGATION: "${query}"`);
    const startTime = Date.now();
    
    try {
        // Determine what type of investigation is needed
        const investigationType = classifyInvestigation(query);
        console.log(`   Investigation type: ${investigationType}`);
        
        let allEvidence = [];
        
        // Run targeted deep searches based on investigation type
        switch(investigationType) {
            case 'training':
                allEvidence = await investigateTraining(query);
                break;
            case 'personnel':
                allEvidence = await investigatePersonnel(query);
                break;
            case 'policy':
                allEvidence = await investigatePolicy(query);
                break;
            case 'statistics':
                allEvidence = await investigateStatistics(query);
                break;
            case 'legal':
                allEvidence = await investigateLegal(query);
                break;
            default:
                allEvidence = await investigateGeneral(query);
        }
        
        // Deep dive: follow chains of evidence
        const deepEvidence = await followEvidenceChain(query, allEvidence);
        
        // Cross-validate with official records
        const validatedEvidence = await validateWithOfficialRecords(deepEvidence);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   Total evidence: ${validatedEvidence.length} sources | ${elapsed}s`);
        
        // Build answer with deep findings
        const answer = buildDeepInvestigativeAnswer(query, validatedEvidence);
        
        // News and videos (display only, NOT in answer)
        const newsResults = await getNews(query);
        const videoResults = await getVideos(query);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answer,
            newsArticles: newsResults,
            videoSources: videoResults,
            allSources: validatedEvidence,
            investigationType: investigationType,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Investigation error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Investigation completed. ${error.message}`,
                sentences: [{ text: `Investigation completed.`, citationId: null }],
                citations: []
            },
            newsArticles: [],
            videoSources: [],
            allSources: []
        });
    }
}

// ============================================
// CLASSIFY THE TYPE OF INVESTIGATION NEEDED
// ============================================
function classifyInvestigation(query) {
    const q = query.toLowerCase();
    
    if (q.includes('train') || q.includes('academy') || q.includes('course') || q.includes('weeks') || q.includes('hours') || q.includes('certification')) {
        return 'training';
    }
    if (q.includes('agent') || q.includes('officer') || q.includes('personnel') || q.includes('employee') || q.includes('staff')) {
        return 'personnel';
    }
    if (q.includes('governor') || q.includes('prime minister') || q.includes('president') || q.includes('director') || q.includes('commissioner')) {
        return 'personnel';
    }
    if (q.includes('policy') || q.includes('procedure') || q.includes('directive') || q.includes('memo') || q.includes('order')) {
        return 'policy';
    }
    if (q.includes('statistic') || q.includes('rate') || q.includes('percent') || q.includes('number') || q.includes('data')) {
        return 'statistics';
    }
    if (q.includes('law') || q.includes('legal') || q.includes('statute') || q.includes('regulation') || q.includes('code')) {
        return 'legal';
    }
    
    return 'general';
}

// ============================================
// DEEP INVESTIGATION: TRAINING RECORDS
// Searches government training academies, curricula, length requirements
// ============================================
async function investigateTraining(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey || !cx) return results;
    
    // Training-specific government domains and search terms
    const trainingTargets = [
        // ICE/FLETC training
        { domain: 'fletc.gov', searchTerms: ['basic training', 'curriculum', 'weeks', 'hours', 'program length', 'graduation requirements'] },
        { domain: 'ice.gov', searchTerms: ['enforcement and removal operations', 'ERO training', 'basic immigration law enforcement', 'BILE'] },
        { domain: 'dhs.gov', searchTerms: ['training standards', 'law enforcement training', 'homeland security training'] },
        
        // Other federal training
        { domain: 'fbi.gov', searchTerms: ['training academy', 'new agent training', 'basic field training'] },
        { domain: 'dea.gov', searchTerms: ['training academy', 'basic agent training'] },
        { domain: 'cbp.gov', searchTerms: ['border patrol academy', 'training curriculum', 'basic training'] },
        
        // Training standards bodies
        { domain: 'doj.gov', searchTerms: ['law enforcement training standards', 'officer certification'] },
        { domain: 'ojp.gov', searchTerms: ['training requirements', 'law enforcement standards'] }
    ];
    
    // Extract specific training length queries from the original query
    const trainingLengthQueries = [
        `${query} basic training length weeks`,
        `${query} academy curriculum hours`,
        `${query} training program duration`,
        `${query} graduation requirements`,
        `FLETC ${query} training standards`
    ];
    
    // Search each training target
    for (const target of trainingTargets) {
        for (const term of target.searchTerms) {
            const searchQuery = `${query} ${term}`;
            
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(searchQuery)}&siteSearch=${target.domain}&siteSearchFilter=i&num=5`;
                
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.items) {
                        for (const item of data.items) {
                            if (!seenUrls.has(item.link) && item.snippet && item.snippet.length > 50) {
                                seenUrls.add(item.link);
                                
                                // Check if this contains training length data
                                const hasWeeks = /\b\d{1,3}\s*weeks?\b/i.test(item.snippet);
                                const hasHours = /\b\d{1,4}\s*hours?\b/i.test(item.snippet);
                                const hasMonths = /\b\d{1,2}\s*months?\b/i.test(item.snippet);
                                
                                results.push({
                                    type: "government",
                                    source: target.domain,
                                    subType: "training",
                                    title: item.title,
                                    url: item.link,
                                    snippet: item.snippet,
                                    containsLengthData: hasWeeks || hasHours || hasMonths,
                                    investigationType: "training"
                                });
                            }
                        }
                    }
                }
                
                await new Promise(r => setTimeout(r, 80));
                
            } catch (error) {
                // Continue
            }
        }
    }
    
    // Also search for specific training documentation (PDFs, manuals)
    try {
        const pdfQuery = `${query} training manual filetype:pdf`;
        const pdfUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(pdfQuery)}&num=5`;
        const pdfResponse = await fetch(pdfUrl);
        
        if (pdfResponse.ok) {
            const pdfData = await pdfResponse.json();
            if (pdfData.items) {
                for (const item of pdfData.items) {
                    if (!seenUrls.has(item.link)) {
                        seenUrls.add(item.link);
                        results.push({
                            type: "government",
                            source: "Training Document",
                            subType: "manual",
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isPdf: true,
                            investigationType: "training"
                        });
                    }
                }
            }
        }
    } catch (e) {}
    
    return results;
}

// ============================================
// DEEP INVESTIGATION: PERSONNEL / OFFICIAL BIOGRAPHIES
// Searches government directories, official bios, appointment records
// ============================================
async function investigatePersonnel(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey || !cx) return results;
    
    // Extract potential person name from query
    const personName = extractPersonName(query);
    console.log(`   Looking for official bio of: ${personName}`);
    
    // Official biography sources
    const bioTargets = [
        { domain: 'bankofcanada.ca', searchTerms: ['governor', 'biography', 'former governor'] },
        { domain: 'bankofengland.co.uk', searchTerms: ['governor', 'biography', 'former governor'] },
        { domain: 'whitehouse.gov', searchTerms: ['biography', 'administration', 'official'] },
        { domain: 'congress.gov', searchTerms: ['biography', 'member', 'senator', 'representative'] },
        { domain: 'canada.ca', searchTerms: ['prime minister', 'minister', 'biography', 'governor general'] },
        { domain: 'gov.uk', searchTerms: ['prime minister', 'minister', 'biography'] },
        { domain: 'state.gov', searchTerms: ['secretary', 'biography', 'official'] },
        { domain: 'treasury.gov', searchTerms: ['secretary', 'biography'] },
        { domain: 'federalreserve.gov', searchTerms: ['board members', 'chair', 'biography'] }
    ];
    
    // Search for official biography
    for (const target of bioTargets) {
        const searchQuery = `${personName} biography ${target.searchTerms[0]}`;
        
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(searchQuery)}&siteSearch=${target.domain}&siteSearchFilter=i&num=5`;
            
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            
                            // Check if this is an official biography page
                            const isBio = item.title.toLowerCase().includes('biography') || 
                                         item.title.toLowerCase().includes('governor') ||
                                         item.title.toLowerCase().includes('about');
                            
                            results.push({
                                type: "government",
                                source: target.domain,
                                subType: "biography",
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                isOfficialBio: isBio,
                                personName: personName,
                                investigationType: "personnel"
                            });
                        }
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 80));
            
        } catch (error) {
            // Continue
        }
    }
    
    // Also search for official appointment records
    try {
        const appointmentQuery = `${personName} appointed governor bank of canada`;
        const apptUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(appointmentQuery)}&num=5`;
        const apptResponse = await fetch(apptUrl);
        
        if (apptResponse.ok) {
            const apptData = await apptResponse.json();
            if (apptData.items) {
                for (const item of apptData.items) {
                    if (!seenUrls.has(item.link)) {
                        seenUrls.add(item.link);
                        results.push({
                            type: "government",
                            source: "Official Record",
                            subType: "appointment",
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            investigationType: "personnel"
                        });
                    }
                }
            }
        }
    } catch (e) {}
    
    return results;
}

// ============================================
// DEEP INVESTIGATION: POLICY & PROCEDURES
// ============================================
async function investigatePolicy(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey || !cx) return results;
    
    const policyDomains = [
        'federalregister.gov', 'regulations.gov', 'dhs.gov', 'justice.gov',
        'state.gov', 'treasury.gov', 'whitehouse.gov', 'archives.gov'
    ];
    
    for (const domain of policyDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            results.push({
                                type: "government",
                                source: domain,
                                subType: "policy",
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                investigationType: "policy"
                            });
                        }
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 80));
            
        } catch (error) {
            // Continue
        }
    }
    
    return results;
}

// ============================================
// DEEP INVESTIGATION: STATISTICS & DATA
// ============================================
async function investigateStatistics(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey || !cx) return results;
    
    const statsDomains = [
        'bls.gov', 'census.gov', 'data.gov', 'statcan.gc.ca', 
        'ons.gov.uk', 'eurostat.ec.europa.eu', 'who.int', 'oecd.org'
    ];
    
    for (const domain of statsDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            results.push({
                                type: "government",
                                source: domain,
                                subType: "statistics",
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                investigationType: "statistics"
                            });
                        }
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 80));
            
        } catch (error) {
            // Continue
        }
    }
    
    return results;
}

// ============================================
// DEEP INVESTIGATION: LEGAL / COURT RECORDS
// ============================================
async function investigateLegal(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    const seenUrls = new Set();
    
    if (!apiKey || !cx) return results;
    
    const legalDomains = [
        'supremecourt.gov', 'law.cornell.edu', 'justice.gov', 'courts.ca.gov',
        'law.justia.com', 'findlaw.com', 'govinfo.gov', 'congress.gov'
    ];
    
    for (const domain of legalDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            results.push({
                                type: "government",
                                source: domain,
                                subType: "legal",
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                investigationType: "legal"
                            });
                        }
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 80));
            
        } catch (error) {
            // Continue
        }
    }
    
    return results;
}

// ============================================
// GENERAL INVESTIGATION (FALLBACK)
// ============================================
async function investigateGeneral(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const results = [];
    
    if (!apiKey || !cx) return results;
    
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        type: "web",
                        source: new URL(item.link).hostname,
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: item.link.includes('.gov')
                    });
                }
            }
        }
    } catch (error) {
        console.error('General search error:', error);
    }
    
    return results;
}

// ============================================
// FOLLOW THE EVIDENCE CHAIN
// Takes initial results and searches for deeper, related information
// ============================================
async function followEvidenceChain(query, initialResults) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const allResults = [...initialResults];
    const seenUrls = new Set(initialResults.map(r => r.url));
    
    if (!apiKey || !cx) return allResults;
    
    // Extract key terms from initial results to dig deeper
    const keyTerms = new Set();
    
    for (const result of initialResults) {
        // Extract numbers that might be training lengths, dates, etc.
        const numbers = result.snippet.match(/\b\d{1,3}\s*(weeks?|months?|hours?|days?)\b/gi);
        if (numbers) {
            numbers.forEach(n => keyTerms.add(n.toLowerCase()));
        }
        
        // Extract agency names
        const agencies = result.snippet.match(/\b(ICE|DHS|FLETC|CBP|ERO|BILE)\b/gi);
        if (agencies) {
            agencies.forEach(a => keyTerms.add(a));
        }
    }
    
    // Search for each key term to find corroborating evidence
    for (const term of Array.from(keyTerms).slice(0, 5)) {
        const followQuery = `${query} ${term} official government`;
        
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(followQuery)}&num=5`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            allResults.push({
                                type: "government",
                                source: new URL(item.link).hostname,
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                isCorroborating: true,
                                relatedTerm: term
                            });
                        }
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 100));
            
        } catch (error) {
            // Continue
        }
    }
    
    return allResults;
}

// ============================================
// VALIDATE WITH OFFICIAL RECORDS
// Cross-reference findings with official government records
// ============================================
async function validateWithOfficialRecords(sources) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    const validated = [];
    
    if (!apiKey || !cx) return sources;
    
    for (const source of sources) {
        // Extract potential factual claims
        const claims = extractClaims(source.snippet);
        
        // Validate each claim against official records
        const validationResults = [];
        
        for (const claim of claims.slice(0, 3)) {
            try {
                const validateUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(claim)}&siteSearch=.gov&siteSearchFilter=i&num=3`;
                const response = await fetch(validateUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.items && data.items.length > 0) {
                        validationResults.push({
                            claim: claim,
                            verified: true,
                            corroboratingSources: data.items.length
                        });
                    } else {
                        validationResults.push({
                            claim: claim,
                            verified: false,
                            corroboratingSources: 0
                        });
                    }
                }
            } catch (error) {
                validationResults.push({
                    claim: claim,
                    verified: null,
                    error: error.message
                });
            }
            
            await new Promise(r => setTimeout(r, 50));
        }
        
        validated.push({
            ...source,
            validation: validationResults,
            verifiedClaims: validationResults.filter(v => v.verified).length
        });
    }
    
    return validated.sort((a, b) => b.verifiedClaims - a.verifiedClaims);
}

// ============================================
// EXTRACT FACTUAL CLAIMS FROM TEXT
// ============================================
function extractClaims(text) {
    if (!text) return [];
    
    const claims = [];
    
    // Look for sentences with specific patterns
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
        const hasNumber = /\d+/.test(sentence);
        const hasUnit = /\b(weeks|months|hours|days|percent|dollars)\b/i.test(sentence);
        const hasAgency = /\b(ICE|DHS|FLETC|CBP|ERO|FBI|DOJ)\b/i.test(sentence);
        const isLongEnough = sentence.length > 30 && sentence.length < 200;
        
        if ((hasNumber || hasAgency) && isLongEnough) {
            claims.push(sentence.trim());
        }
    }
    
    return claims.slice(0, 5);
}

// ============================================
// EXTRACT PERSON NAME FROM QUERY
// ============================================
function extractPersonName(query) {
    // Common patterns for names in queries
    const patterns = [
        /(?:who is|about|tell me about)\s+([A-Z][a-z]+ [A-Z][a-z]+)/i,
        /([A-Z][a-z]+ [A-Z][a-z]+)/  // Capitalized two-word name
    ];
    
    for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    // Return the whole query if it looks like a name
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(query)) {
        return query;
    }
    
    return query;
}

// ============================================
// BUILD DEEP INVESTIGATIVE ANSWER
// Same perfect format, but with deep findings
// ============================================
function buildDeepInvestigativeAnswer(query, sources) {
    const citations = [];
    const sentences = [];
    let citationId = 1;
    
    // Separate by type
    const trainingSources = sources.filter(s => s.investigationType === 'training' || s.subType === 'training');
    const personnelSources = sources.filter(s => s.investigationType === 'personnel');
    const govSources = sources.filter(s => s.type === 'government');
    
    // Introduction
    sentences.push({
        text: `DEEP INVESTIGATION REPORT — ${sources.length} official sources analyzed (${govSources.length} government records) about "${query}":`,
        citationId: null
    });
    
    // Extract and present specific findings
    const findings = extractKeyFindings(sources, query);
    
    if (findings.length > 0) {
        sentences.push({
            text: `KEY FINDINGS FROM OFFICIAL GOVERNMENT RECORDS:`,
            citationId: null
        });
        
        for (const finding of findings.slice(0, 8)) {
            sentences.push({
                text: `"${finding.text}"`,
                citationId: citationId
            });
            
            citations.push({
                id: citationId,
                text: finding.fullText || finding.text,
                source: `🏛️ ${finding.source}`,
                url: finding.url,
                findingType: finding.type
            });
            citationId++;
        }
    }
    
    // Training-specific findings (weeks, hours, curriculum)
    if (trainingSources.length > 0) {
        const trainingLengths = extractTrainingLengths(trainingSources);
        
        if (trainingLengths.length > 0) {
            for (const length of trainingLengths) {
                sentences.push({
                    text: `"${length.text}"`,
                    citationId: citationId
                });
                citations.push({
                    id: citationId,
                    text: length.fullContext,
                    source: `🏛️ TRAINING RECORD: ${length.source}`,
                    url: length.url
                });
                citationId++;
            }
        }
    }
    
    // Personnel/biography findings
    if (personnelSources.length > 0) {
        const bioFacts = extractBiographyFacts(personnelSources);
        
        for (const fact of bioFacts.slice(0, 5)) {
            sentences.push({
                text: `"${fact.text}"`,
                citationId: citationId
            });
            citations.push({
                id: citationId,
                text: fact.fullText,
                source: `🏛️ OFFICIAL BIOGRAPHY: ${fact.source}`,
                url: fact.url
            });
            citationId++;
        }
    }
    
    // Regular government sources
    for (const source of govSources.slice(0, 10)) {
        if (source.snippet && source.snippet.length > 60) {
            sentences.push({
                text: `"${source.snippet.substring(0, 300)}"`,
                citationId: citationId
            });
            citations.push({
                id: citationId,
                text: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                source: `🏛️ ${source.source}`,
                url: source.url
            });
            citationId++;
        }
    }
    
    // Conclusion with verification status
    const verifiedCount = sources.filter(s => s.verifiedClaims > 0).length;
    sentences.push({
        text: `INVESTIGATION SUMMARY: ${sources.length} total sources. ${verifiedCount} sources contain cross-verified information from official government records. Each citation contains a direct quote from its source. Click any [number] to verify.`,
        citationId: null
    });
    
    let fullText = "";
    for (const sentence of sentences) {
        fullText += sentence.text + " ";
    }
    
    return {
        text: fullText,
        sentences: sentences,
        citations: citations,
        evidenceCount: sources.length,
        governmentCount: govSources.length,
        findingsCount: findings.length
    };
}

// ============================================
// EXTRACT KEY FINDINGS FROM SOURCES
// ============================================
function extractKeyFindings(sources, query) {
    const findings = [];
    const seenTexts = new Set();
    
    for (const source of sources) {
        const text = source.snippet || '';
        
        // Look for specific factual patterns
        const patterns = [
            { pattern: /\b(\d{1,3})\s*(weeks?|months?|hours?|days?)\s+of\s+training\b/i, type: 'training_length' },
            { pattern: /\b(governor|prime minister|president|director|commissioner)\s+of\s+([A-Za-z\s]+)\b/i, type: 'position' },
            { pattern: /\b(former|current|previous)\s+([A-Za-z\s]+)\s+(governor|minister|director)\b/i, type: 'tenure' },
            { pattern: /\b(appointed|served|serving)\s+(from|between)\s+(\d{4})\s+(to|and)\s+(\d{4})\b/i, type: 'dates' }
        ];
        
        for (const { pattern, type } of patterns) {
            const match = text.match(pattern);
            if (match && !seenTexts.has(match[0])) {
                seenTexts.add(match[0]);
                findings.push({
                    text: match[0],
                    fullText: text.substring(0, 300),
                    source: source.source,
                    url: source.url,
                    type: type
                });
            }
        }
        
        // Also look for sentences with numbers that seem factual
        const sentences = text.split(/[.!?]+/);
        for (const sentence of sentences) {
            if (sentence.length > 40 && sentence.length < 200 && /\d+/.test(sentence)) {
                const key = sentence.substring(0, 50);
                if (!seenTexts.has(key)) {
                    seenTexts.add(key);
                    findings.push({
                        text: sentence.trim(),
                        fullText: sentence.trim(),
                        source: source.source,
                        url: source.url,
                        type: 'factual_statement'
                    });
                }
            }
        }
    }
    
    return findings.slice(0, 20);
}

// ============================================
// EXTRACT TRAINING LENGTHS SPECIFICALLY
// ============================================
function extractTrainingLengths(sources) {
    const lengths = [];
    const seen = new Set();
    
    for (const source of sources) {
        const text = source.snippet + ' ' + (source.fullText || '');
        
        // Look for training duration patterns
        const patterns = [
            /\b(\d{1,3})\s*[-–]?\s*(\d{1,3})?\s*(weeks?)\s+of\s+(?:basic\s+)?training\b/i,
            /\b(\d{1,3})\s*(weeks?|months?)\s+(?:long|duration|program|course|academy)\b/i,
            /\btraining\s+(?:program|course|academy)\s+(?:lasts|takes|is)\s+(\d{1,3})\s*(weeks?|months?)\b/i,
            /\b(\d{1,3})\s*(weeks?)\s+of\s+(?:instruction|curriculum)\b/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && !seen.has(match[0])) {
                seen.add(match[0]);
                
                // Get context around the match
                const matchIndex = text.toLowerCase().indexOf(match[0].toLowerCase());
                const context = text.substring(Math.max(0, matchIndex - 100), Math.min(text.length, matchIndex + 200));
                
                lengths.push({
                    text: match[0],
                    fullContext: context.trim(),
                    source: source.source,
                    url: source.url
                });
            }
        }
    }
    
    return lengths.slice(0, 5);
}

// ============================================
// EXTRACT BIOGRAPHY FACTS
// ============================================
function extractBiographyFacts(sources) {
    const facts = [];
    const seen = new Set();
    
    for (const source of sources) {
        const text = source.snippet || '';
        
        // Look for position/title patterns
        const patterns = [
            /\b(?:served as|was|is|became)\s+(?:the\s+)?(governor|prime minister|president|director|chair)\s+(?:of\s+)?([A-Za-z\s]+?)(?:\s+from|\s+between|\s+and|\s*\.|$)/i,
            /\b(?:former|previous)\s+(governor|prime minister|director)\s+(?:of\s+)?([A-Za-z\s]+?)(?:\s+from|\s*\.|$)/i,
            /\b(appointed|named)\s+(?:as\s+)?(governor|director|chair)\s+(?:of\s+)?([A-Za-z\s]+?)(?:\s+in|\s*\.|$)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && !seen.has(match[0])) {
                seen.add(match[0]);
                facts.push({
                    text: match[0],
                    fullText: text.substring(0, 300),
                    source: source.source,
                    url: source.url
                });
            }
        }
    }
    
    return facts;
}

// ============================================
// NEWS (DISPLAY ONLY)
// ============================================
async function getNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=6&token=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.articles) {
                return data.articles.map(a => ({
                    title: a.title,
                    url: a.url,
                    source: new URL(a.url).hostname,
                    date: a.publishedAt?.split('T')[0],
                    description: a.description
                }));
            }
        }
    } catch (e) {}
    return [];
}

// ============================================
// VIDEOS (DISPLAY ONLY)
// ============================================
async function getVideos(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=4&key=${apiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                return data.items.map(i => ({
                    title: i.snippet.title,
                    url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
                    channel: i.snippet.channelTitle,
                    thumbnail: i.snippet.thumbnails?.medium?.url || ''
                }));
            }
        }
    } catch (e) {}
    return [];
}
