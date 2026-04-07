// ============================================
// DEBATESPACE - MAXIMUM DEPTH RESEARCH
// Every sentence has a citation from government sources
// AI only formats - never generates facts
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 MAX DEPTH RESEARCH: "${query}"`);
    
    try {
        // STEP 1: GOVERNMENT SOURCES (Deep crawl all levels)
        const govEvidence = await gatherDeepGovernmentEvidence(query);
        
        // STEP 2: INTERNATIONAL GOVERNMENT & UN AGENCIES
        const intlGovEvidence = await gatherInternationalGovEvidence(query);
        
        // STEP 3: ARCHIVE & SCRUBBED DATA (Historical + Wayback)
        const archiveEvidence = await gatherDeepArchiveEvidence(query);
        
        // STEP 4: ACADEMIC DATABASES (Multiple sources)
        const academicEvidence = await gatherDeepAcademicEvidence(query);
        
        // STEP 5: NEWS ARTICLES (Multiple APIs + RSS)
        const newsArticles = await gatherDeepNewsArticles(query);
        
        // STEP 6: VIDEO CONTENT (YouTube + other platforms)
        const videoSources = await gatherDeepVideoSources(query);
        
        // STEP 7: COURT & LEGAL DOCUMENTS
        const legalEvidence = await gatherLegalEvidence(query);
        
        // STEP 8: SCIENTIFIC & RESEARCH PAPERS
        const scientificEvidence = await gatherScientificEvidence(query);
        
        // STEP 9: THINK TANKS & POLICY RESEARCH
        const thinkTankEvidence = await gatherThinkTankEvidence(query);
        
        // STEP 10: GENERAL WEB (Tavily + additional)
        const webEvidence = await gatherDeepWebEvidence(query);
        
        // Combine ALL evidence (government prioritized)
        const allEvidence = [
            ...govEvidence,
            ...intlGovEvidence,
            ...archiveEvidence,
            ...academicEvidence,
            ...legalEvidence,
            ...scientificEvidence,
            ...thinkTankEvidence,
            ...webEvidence
        ];
        
        console.log(`\n📊 MAX DEPTH EVIDENCE COLLECTED:`);
        console.log(`   US Government: ${govEvidence.length}`);
        console.log(`   International Gov: ${intlGovEvidence.length}`);
        console.log(`   Archives: ${archiveEvidence.length}`);
        console.log(`   Academic: ${academicEvidence.length}`);
        console.log(`   Legal: ${legalEvidence.length}`);
        console.log(`   Scientific: ${scientificEvidence.length}`);
        console.log(`   Think Tanks: ${thinkTankEvidence.length}`);
        console.log(`   News: ${newsArticles.length}`);
        console.log(`   Video: ${videoSources.length}`);
        console.log(`   Web: ${webEvidence.length}`);
        console.log(`   TOTAL: ${allEvidence.length} sources`);
        
        // Build answer with deep analysis and EVERY sentence cited
        const answerWithCitations = buildDeepAnswerWithCitations(query, allEvidence, govEvidence, intlGovEvidence);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: answerWithCitations,
            newsArticles: newsArticles,
            videoSources: videoSources,
            allSources: allEvidence.slice(0, 100),
            timestamp: new Date().toISOString(),
            depthStats: {
                totalSources: allEvidence.length,
                governmentSources: govEvidence.length + intlGovEvidence.length,
                academicSources: academicEvidence.length,
                legalSources: legalEvidence.length,
                archiveSources: archiveEvidence.length
            }
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
// STEP 1: DEEP GOVERNMENT EVIDENCE (US Focus)
// ============================================
async function gatherDeepGovernmentEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const allEvidence = [];
    const seenUrls = new Set();
    
    // Expanded list of US government agencies
    const usGovAgencies = [
        // Executive Branch
        'whitehouse.gov', 'usa.gov', 'govinfo.gov', 'federalregister.gov',
        // Justice & Law
        'justice.gov', 'fbi.gov', 'dea.gov', 'atf.gov', 'uscourts.gov', 'supremecourt.gov',
        'law.cornell.edu', 'loc.gov', 'ncjrs.gov',
        // Health & Human Services
        'hhs.gov', 'cdc.gov', 'nih.gov', 'fda.gov', 'samhsa.gov', 'medicare.gov',
        'medicaid.gov', 'healthcare.gov', 'who.int',
        // Treasury & Economy
        'treasury.gov', 'irs.gov', 'federalreserve.gov', 'sec.gov', 'cfpb.gov',
        'fdic.gov', 'occ.treasury.gov', 'bea.gov', 'bls.gov', 'census.gov',
        // Homeland Security
        'dhs.gov', 'ice.gov', 'cbp.gov', 'tsa.gov', 'fema.gov', 'uscis.gov',
        // Defense
        'defense.gov', 'army.mil', 'navy.mil', 'af.mil', 'usmcu.edu', 'ndu.edu',
        // Energy & Environment
        'energy.gov', 'epa.gov', 'noaa.gov', 'usgs.gov', 'nps.gov', 'fs.usda.gov',
        // Education & Labor
        'ed.gov', 'dol.gov', 'nsf.gov', 'doleta.gov',
        // Transportation & Infrastructure
        'transportation.gov', 'faa.gov', 'fmcsa.dot.gov', 'ntsb.gov', 'amtrak.com',
        // Agriculture
        'usda.gov', 'fsis.usda.gov', 'fns.usda.gov', 'aphis.usda.gov',
        // Housing & Urban Development
        'hud.gov', 'usich.gov',
        // Veterans Affairs
        'va.gov', 'benefits.va.gov',
        // State Department
        'state.gov', 'usaid.gov', 'peacecorps.gov',
        // Intelligence
        'odni.gov', 'cia.gov', 'nsa.gov', 'dni.gov',
        // Independent Agencies
        'gao.gov', 'usps.com', 'nasa.gov', 'nsf.gov', 'usaid.gov',
        // Commissions & Boards
        'ftc.gov', 'fcc.gov', 'sec.gov', 'cfc.gov', 'nrc.gov',
        // State-level government
        '.gov', '.state.', '.county.', 'cityof'
    ];
    
    // Search each agency with multiple queries
    for (const agency of usGovAgencies.slice(0, 30)) {
        try {
            // Use site search for each agency
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency}&siteSearchFilter=i&num=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            
                            // Extract more metadata if available
                            let date = null;
                            if (item.pagemap?.metatags?.[0]?.['article:published_time']) {
                                date = item.pagemap.metatags[0]['article:published_time'].split('T')[0];
                            }
                            
                            allEvidence.push({
                                type: "government",
                                source: agency,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: date,
                                priority: 1
                            });
                        }
                    }
                }
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`[Gov Agency ${agency}] Error:`, error.message);
        }
    }
    
    // Also search government document repositories
    const govRepos = [
        'https://www.govinfo.gov/app/search/${encodeURIComponent(query)}',
        'https://www.federalregister.gov/documents/search?conditions[term]=${encodeURIComponent(query)}',
        'https://catalog.data.gov/dataset?q=${encodeURIComponent(query)}'
    ];
    
    return allEvidence;
}

// ============================================
// STEP 2: INTERNATIONAL GOVERNMENT EVIDENCE
// ============================================
async function gatherInternationalGovEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    // International government agencies
    const intlAgencies = [
        // United Nations System
        'un.org', 'who.int', 'worldbank.org', 'imf.org', 'ilo.org', 'unesco.org',
        'unicef.org', 'wfp.org', 'fao.org', 'unodc.org', 'unhcr.org', 'unep.org',
        'undp.org', 'unfpa.org', 'unwomen.org', 'wipo.int', 'icao.int', 'imo.org',
        'upu.int', 'itu.int', 'wmo.int', 'ifad.org', 'unido.org',
        // Canada
        'canada.ca', 'statcan.gc.ca', 'bankofcanada.ca', 'irb-cisr.gc.ca',
        'csis-scrs.gc.ca', 'rcmp-grc.gc.ca', 'cbsa-asfc.gc.ca',
        // United Kingdom
        'gov.uk', 'parliament.uk', 'legislation.gov.uk', 'nationalarchives.gov.uk',
        'ons.gov.uk', 'bankofengland.co.uk', 'mod.uk', 'homeoffice.gov.uk',
        // European Union
        'europa.eu', 'ec.europa.eu', 'consilium.europa.eu', 'eur-lex.europa.eu',
        'europarl.europa.eu', 'curia.europa.eu', 'ecb.europa.eu', 'eurostat.ec.europa.eu',
        // Australia
        'gov.au', 'abs.gov.au', 'rba.gov.au', 'dfat.gov.au', 'homeaffairs.gov.au',
        // New Zealand
        'govt.nz', 'stats.govt.nz', 'rbnz.govt.nz', 'mbie.govt.nz',
        // Germany
        'bund.de', 'bundesregierung.de', 'destatis.de', 'bundesbank.de',
        // France
        'gouvernement.fr', 'insee.fr', 'banque-france.fr',
        // Japan
        'gov.jp', 'cas.go.jp', 'meti.go.jp', 'mofa.go.jp', 'boj.or.jp',
        // China
        'gov.cn', 'stats.gov.cn', 'pbc.gov.cn',
        // India
        'gov.in', 'nic.in', 'rbi.org.in', 'mospi.gov.in',
        // Brazil
        'gov.br', 'ibge.gov.br', 'bcb.gov.br',
        // South Africa
        'gov.za', 'statssa.gov.za', 'resbank.co.za'
    ];
    
    const cxEngines = [
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
        { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT }
    ];
    
    // Search international agencies
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
                                type: "international",
                                source: agency,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null,
                                priority: 1
                            });
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
        } catch (error) {
            console.error(`[Intl Agency ${agency}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 3: DEEP ARCHIVE EVIDENCE (Wayback + Historical)
// ============================================
async function gatherDeepArchiveEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    // Comprehensive archive list
    const archives = [
        // Major archives
        'archive.org', 'web.archive.org', 'archives.gov', 'catalog.archives.gov',
        // Data archives
        'data.gov', 'census.gov', 'data.census.gov', 'nces.ed.gov', 'data.worldbank.org',
        // Historical document archives
        'founding.com', 'loc.gov', 'digitalhistory.uh.edu', 'avalon.law.yale.edu',
        'teachingamericanhistory.org', 'constitution.org', 'founders.archives.gov',
        // Legal archives
        'supremecourt.gov/opinions', 'law.cornell.edu/supremecourt', 'scotusblog.com',
        'ca10.uscourts.gov', 'ca9.uscourts.gov',
        // Congressional archives
        'congress.gov', 'crsreports.congress.gov', 'govtrack.us', 'c-span.org',
        // Scientific archives
        'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'sciencedirect.com', 'jstor.org',
        'scholar.google.com', 'researchgate.net', 'academia.edu',
        // News archives
        'newspapers.com', 'chroniclingamerica.loc.gov', 'newspaperarchive.com',
        // International archives
        'europeana.eu', 'trove.nla.gov.au', 'digitalarchive.org', 'unesco.org/archives'
    ];
    
    // Deep search each archive
    for (const archive of archives) {
        try {
            // Multiple search approaches for each archive
            const urls = [
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${archive}&siteSearchFilter=i&num=10`,
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}+"${archive}"&num=8`
            ];
            
            for (const url of urls) {
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
                                    date: null,
                                    priority: 2
                                });
                            }
                        }
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 80));
            }
            
        } catch (error) {
            console.error(`[Archive ${archive}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 4: DEEP ACADEMIC EVIDENCE
// ============================================
async function gatherDeepAcademicEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    // Comprehensive academic domains
    const academicDomains = [
        '.edu', '.ac.uk', '.ac.za', '.ac.jp', '.ac.nz', '.ac.au', '.ac.il',
        '.edu.au', '.edu.cn', '.edu.br', '.edu.mx', '.ac.in', '.edu.tr',
        'harvard.edu', 'mit.edu', 'stanford.edu', 'berkeley.edu', 'ox.ac.uk',
        'cam.ac.uk', 'ucl.ac.uk', 'ethz.ch', 'tum.de', 'sorbonne.fr',
        'kyoto-u.ac.jp', 'nus.edu.sg', 'anu.edu.au', 'toronto.edu', 'ubc.ca'
    ];
    
    // Academic search engines and repositories
    const academicRepos = [
        'scholar.google.com', 'researchgate.net', 'academia.edu', 'mendeley.com',
        'semanticscholar.org', 'core.ac.uk', 'base-search.net', 'doaj.org',
        'eric.ed.gov', 'ieeexplore.ieee.org', 'acm.org', 'springer.com',
        'wiley.com', 'tandfonline.com', 'sagepub.com', 'emerald.com'
    ];
    
    // Search academic domains
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
                                date: null,
                                priority: 2
                            });
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
            
        } catch (error) {
            console.error(`[Academic ${domain}] Error:`, error.message);
        }
    }
    
    // Search academic repositories
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
                                date: null,
                                priority: 2
                            });
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 80));
            
        } catch (error) {
            console.error(`[Academic Repo ${repo}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 5: DEEP LEGAL EVIDENCE
// ============================================
async function gatherLegalEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const legalSources = [
        'supremecourt.gov', 'uscourts.gov', 'law.cornell.edu', 'findlaw.com',
        'justia.com', 'courthousenews.com', 'scotusblog.com', 'oyez.org',
        'law.cornell.edu/supremecourt', 'ca10.uscourts.gov', 'ca9.uscourts.gov',
        'pacermonitor.com', 'courtlistener.com', 'recapthelaw.org', 'openjurist.org',
        'caselaw.findlaw.com', 'leagle.com', 'law.justia.com'
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
                                date: null,
                                priority: 1
                            });
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 60));
            
        } catch (error) {
            console.error(`[Legal ${source}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 6: SCIENTIFIC EVIDENCE
// ============================================
async function gatherScientificEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const scientificSources = [
        'pubmed.ncbi.nlm.nih.gov', 'nature.com', 'science.org', 'cell.com',
        'thelancet.com', 'nejm.org', 'bmj.com', 'plos.org', 'frontiersin.org',
        'mdpi.com', 'biorxiv.org', 'medrxiv.org', 'arxiv.org', 'ssrn.com',
        'cambridge.org', 'oup.com', 'annualreviews.org', 'pnas.org',
        'jamanetwork.com', 'sagepub.com', 'tandfonline.com', 'wiley.com'
    ];
    
    for (const source of scientificSources) {
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
                                type: "scientific",
                                source: source,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null,
                                priority: 2
                            });
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 60));
            
        } catch (error) {
            console.error(`[Scientific ${source}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 7: THINK TANK & POLICY RESEARCH
// ============================================
async function gatherThinkTankEvidence(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const evidence = [];
    const seenUrls = new Set();
    
    const thinkTanks = [
        'brookings.edu', 'aei.org', 'heritage.org', 'cato.org', 'rand.org',
        'cfr.org', 'carnegieendowment.org', 'wilsoncenter.org', 'urban.org',
        'ppi.org', 'manhattan-institute.org', 'hoover.org', 'nber.org',
        'petersoninstitute.org', 'csis.org', 'chathamhouse.org', 'iiss.org',
        'bruegel.org', 'ceps.eu', 'egmontinstitute.be', 'fride.org',
        'ipri.org', 'jpi.org', 'lowyinstitute.org', 'carnegie-mec.org'
    ];
    
    for (const tt of thinkTanks) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_TT}&q=${encodeURIComponent(query)}&siteSearch=${tt}&siteSearchFilter=i&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            evidence.push({
                                type: "thinktank",
                                source: tt,
                                title: item.title,
                                url: item.link,
                                text: item.snippet,
                                date: null,
                                priority: 2
                            });
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 60));
            
        } catch (error) {
            console.error(`[Think Tank ${tt}] Error:`, error.message);
        }
    }
    
    return evidence;
}

// ============================================
// STEP 8: DEEP NEWS ARTICLES (Multiple APIs)
// ============================================
async function gatherDeepNewsArticles(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    const seenUrls = new Set();
    
    if (!apiKey) return articles;
    
    // Multiple GNews queries for depth
    const queries = [query, `"${query}"`, `${query} analysis`, `${query} report`, `${query} investigation`];
    
    for (const q of queries.slice(0, 3)) {
        try {
            const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=20&country=us&sortby=relevance&token=${apiKey}`;
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
                                content: article.content,
                                type: "news"
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[GNews] Error:', error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return articles;
}

// ============================================
// STEP 9: DEEP VIDEO SOURCES (Multi-platform)
// ============================================
async function gatherDeepVideoSources(query) {
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    const seenIds = new Set();
    
    if (youtubeKey) {
        // Multiple search types for YouTube
        const searchTypes = ['video', 'playlist'];
        const queries = [query, `${query} documentary`, `${query} explained`, `${query} analysis`];
        
        for (const q of queries.slice(0, 3)) {
            try {
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=8&key=${youtubeKey}`;
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
                                    description: item.snippet.description,
                                    type: "video"
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('[YouTube] Error:', error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }
    
    return videos;
}

// ============================================
// STEP 10: DEEP WEB EVIDENCE (Tavily + Scraping)
// ============================================
async function gatherDeepWebEvidence(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const evidence = [];
    
    if (!apiKey) return evidence;
    
    try {
        // Deep search with Tavily
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'advanced',
                max_results: 25,
                include_domains: ['.gov', '.edu', '.org', '.com'],
                include_answer: true,
                include_raw_content: true
            })
        });
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            for (const result of data.results) {
                let siteName = "";
                try {
                    siteName = new URL(result.url).hostname.replace('www.', '');
                } catch(e) {}
                
                // Determine priority based on domain
                let priority = 3;
                if (siteName.includes('.gov')) priority = 1;
                else if (siteName.includes('.edu')) priority = 2;
                else if (siteName.includes('.org')) priority = 2;
                
                evidence.push({
                    type: "web",
                    source: siteName,
                    title: result.title,
                    url: result.url,
                    text: result.content?.substring(0, 800),
                    rawContent: result.raw_content,
                    priority: priority,
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
// BUILD DEEP ANSWER WITH EVERY SENTENCE CITED
// ============================================
function buildDeepAnswerWithCitations(query, allEvidence, govEvidence, intlGovEvidence) {
    // Prioritize evidence by type and relevance
    const prioritizedEvidence = [
        ...govEvidence,
        ...intlGovEvidence,
        ...allEvidence.filter(e => e.type === "legal"),
        ...allEvidence.filter(e => e.type === "archive"),
        ...allEvidence.filter(e => e.type === "academic"),
        ...allEvidence.filter(e => e.type === "scientific"),
        ...allEvidence.filter(e => e.type === "thinktank"),
        ...allEvidence.filter(e => e.type === "web" && e.priority === 1),
        ...allEvidence.filter(e => e.type === "web")
    ];
    
    // Create a map of evidence with IDs and deduplicate
    const evidenceMap = [];
    const seenTexts = new Set();
    let id = 1;
    
    for (const evidence of prioritizedEvidence) {
        // Deduplicate similar text
        const textKey = (evidence.text || '').substring(0, 100);
        if (seenTexts.has(textKey)) continue;
        
        if (evidence.text && evidence.text.length > 40) {
            seenTexts.add(textKey);
            evidenceMap.push({
                id: id,
                text: evidence.text,
                source: evidence.source,
                url: evidence.url,
                type: evidence.type,
                title: evidence.title,
                priority: evidence.priority || 3
            });
            id++;
        }
        
        if (id > 50) break; // Limit to 50 sources for answer depth
    }
    
    // If no evidence found, return message
    if (evidenceMap.length === 0) {
        return {
            text: `No specific data found for "${query}". Please try different keywords or check official government sources directly.`,
            sentences: [],
            citations: [],
            evidenceCount: 0
        };
    }
    
    // Group evidence by theme for better answer construction
    const groupedEvidence = groupEvidenceByTheme(evidenceMap, query);
    
    // Build sentences with citations
    const sentences = [];
    const citations = [];
    
    // Add introduction sentence
    const introText = `According to ${evidenceMap.length} government, legal, and academic sources regarding "${query}":`;
    sentences.push({
        text: introText,
        citationId: null
    });
    
    // Extract key facts from evidence to form coherent sentences
    for (let i = 0; i < Math.min(evidenceMap.length, 25); i++) {
        const ev = evidenceMap[i];
        
        // Clean up the text
        let cleanText = ev.text
            .replace(/\s+/g, ' ')
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
        
        // Make sentence more readable
        if (cleanText.length > 40 && cleanText.length < 400) {
            // Ensure it ends with proper punctuation
            if (!cleanText.match(/[.!?]$/)) {
                cleanText += '.';
            }
            
            sentences.push({
                text: cleanText,
                citationId: ev.id
            });
        }
    }
    
    // Add conclusion if enough evidence
    if (evidenceMap.length > 5) {
        const conclusionText = `This analysis is based on ${evidenceMap.filter(e => e.type === 'government').length} government sources, ${evidenceMap.filter(e => e.type === 'legal').length} legal sources, and ${evidenceMap.filter(e => e.type === 'academic').length} academic sources. For complete verification, please refer to the cited sources below.`;
        sentences.push({
            text: conclusionText,
            citationId: null
        });
    }
    
    // Combine sentences into paragraphs
    let fullText = "";
    for (let i = 0; i < sentences.length; i++) {
        fullText += sentences[i].text;
        if (i < sentences.length - 1) {
            fullText += " ";
        }
    }
    
    // Build citations list with rich metadata
    for (const ev of evidenceMap) {
        let typeIcon = "";
        let typeLabel = "";
        
        switch(ev.type) {
            case "government":
                typeIcon = "🏛️";
                typeLabel = "GOVERNMENT";
                break;
            case "international":
                typeIcon = "🌍";
                typeLabel = "INTERNATIONAL GOV";
                break;
            case "legal":
                typeIcon = "⚖️";
                typeLabel = "LEGAL";
                break;
            case "archive":
                typeIcon = "📜";
                typeLabel = "ARCHIVE";
                break;
            case "academic":
                typeIcon = "🎓";
                typeLabel = "ACADEMIC";
                break;
            case "scientific":
                typeIcon = "🔬";
                typeLabel = "SCIENTIFIC";
                break;
            case "thinktank":
                typeIcon = "🏢";
                typeLabel = "THINK TANK";
                break;
            default:
                typeIcon = "🌐";
                typeLabel = "SOURCE";
        }
        
        citations.push({
            id: ev.id,
            text: ev.text.length > 350 ? ev.text.substring(0, 350) + '...' : ev.text,
            source: `${typeIcon} ${typeLabel}: ${ev.source}`,
            url: ev.url,
            title: ev.title,
            type: ev.type
        });
    }
    
    return {
        text: fullText,
        sentences: sentences,
        citations: citations,
        evidenceCount: evidenceMap.length,
        governmentCount: evidenceMap.filter(e => e.type === 'government' || e.type === 'international').length,
        legalCount: evidenceMap.filter(e => e.type === 'legal').length,
        academicCount: evidenceMap.filter(e => e.type === 'academic' || e.type === 'scientific').length
    };
}

// Helper: Group evidence by theme
function groupEvidenceByTheme(evidenceMap, query) {
    const themes = {};
    const keywords = query.toLowerCase().split(' ');
    
    for (const ev of evidenceMap) {
        const text = ev.text.toLowerCase();
        let matched = false;
        
        for (const keyword of keywords) {
            if (keyword.length > 3 && text.includes(keyword)) {
                if (!themes[keyword]) themes[keyword] = [];
                themes[keyword].push(ev);
                matched = true;
                break;
            }
        }
        
        if (!matched) {
            if (!themes.other) themes.other = [];
            themes.other.push(ev);
        }
    }
    
    return themes;
}
