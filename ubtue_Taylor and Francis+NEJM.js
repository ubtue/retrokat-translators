{
	"translatorID": "ab81f35a-c47b-4cd1-9df5-dda7660dc78b",
	"label": "ubtue_Taylor and Francis+NEJM",
	"creator": "Sebastian Karcher",
	"target": "^https?://(www\\.)?((tandfonline\\.com)|(nejm\\.org))",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-15 07:37:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Taylor and Francis Translator
	Copyright © 2011 Sebastian Karcher
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/doi\/(abs|full|figure)\/10\./)) {
		return "journalArticle";
	} else if ((url.indexOf('/action/doSearch?')>-1 || url.indexOf('/toc/')>-1) && getSearchResults(doc, true)) {
		return "multiple";
	}
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	//multiples in search results:
	var rows = ZU.xpath(doc, '//article[contains(@class, "searchResultItem")]//a[contains(@href, "/doi/") and contains(@class, "ref")]');
	if (rows.length==0) {
		//multiples in toc view:
		rows = ZU.xpath(doc, '//div[contains(@class, "articleLink") or contains(@class, "art_title")]/a[contains(@href, "/doi/") and contains(@class, "ref")]');
	}
	for (var i=0; i<rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	var match = url.match(/\/doi\/(?:abs|full|figure)\/(10\.[^?#]+)/);
	var doi = match[1];

	var baseUrl = url.match(/https?:\/\/[^/]+/)[0];
	var postUrl = baseUrl + '/action/downloadCitation';
	var postBody = 'downloadFileName=citation&' +
					'direct=true&' +
					'include=abs&' +
					'doi=';
	var risFormat = '&format=ris';
	var bibtexFormat = '&format=bibtex';

	ZU.doPost(postUrl, postBody + doi + bibtexFormat, function(text) {
		var translator = Zotero.loadTranslator("import");
		// Use BibTeX translator
		translator.setTranslator("9cb70025-a888-4a29-a210-93ec52da40d4");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			// BibTeX content can have HTML entities (e.g. &amp;) in various fields
			// We'll just try to unescape the most likely fields to contain these entities
			// Note that RIS data is not always correct, so we avoid using it
			var unescapeFields = ['title', 'publicationTitle', 'abstractNote'];
			for (var i=0; i<unescapeFields.length; i++) {
				if (item[unescapeFields[i]]) {
					item[unescapeFields[i]] = ZU.unescapeHTML(item[unescapeFields[i]]);
				}
			}

			item.bookTitle = item.publicationTitle;

			//unfortunately, bibtex is missing some data
			//publisher, ISSN/ISBN
			ZU.doPost(postUrl, postBody + doi + risFormat, function(text) {
				// Y1 is online publication date
				if (/^DA\s+-\s+/m.test(text)) {
					text = text.replace(/^Y1(\s+-.*)/gm, '');
				}
				//ubtue: add tag "Book Review"
				let dcType = ZU.xpathText(doc, '//meta[@name="dc.Type"]/@content');
				if (dcType && dcType.match(/book\s?-?review/gi)) item.tags.push("Book Review");
				
				risTrans = Zotero.loadTranslator("import");
				risTrans.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
				risTrans.setString(text);
				risTrans.setHandler("itemDone", function(obj, risItem) {
					if (!item.title) item.title = "<no title>";	//RIS title can be even worse, it actually says "null"
					if (risItem.date) item.date = risItem.date; // More complete
					item.publisher = risItem.publisher;
					item.ISSN = risItem.ISSN;
					item.ISBN = risItem.ISBN;
					//clean up abstract removing Abstract:, Summary: or Abstract Summary:
					if (item.abstractNote) item.abstractNote = item.abstractNote.replace(/^(Abstract)?\s*(Summary)?:?\s*/i, "");
					if (item.title.toUpperCase() == item.title) {
						item.title = ZU.capitalizeTitle(item.title, true);
					}
					//ubtue:adding subtitle
					let subtitle = ZU.xpathText(doc, '//*[@class="NLM_subtitle"]');
					if (subtitle && subtitle.length) item.title += ': ' + subtitle;
					//ubtue:item.creators retrieved from ris, because bibtex is adding some unuseful "names"
					//e.g. corporate bodies "Bill Gaventa and National Collaborative on Faith and Disability, with" https://doi.org/10.1080/23312521.2020.1743223
					//or title like "Rev." https://www.tandfonline.com/doi/full/10.1080/23312521.2020.1738627
					for (let creator of risItem.creators) 
					{
						creator.firstName = creator.firstName.replace(/\s+/, ' ');
						creator.lastName = creator.lastName.replace(/\s+/, ' ');
					}
					finalizeItem(item, doc, doi, baseUrl);
				});
				risTrans.translate();
			});
		});
		translator.translate();
	});
}



function finalizeItem(item, doc, doi, baseUrl) {
	var pdfurl = baseUrl + '/doi/pdf/';
	var absurl = baseUrl + '/doi/abs/';

	//add keywords
	var keywords = ZU.xpath(doc, '//div[contains(@class, "abstractKeywords")]//a');
	for (var i=0; i<keywords.length; i++) {
		item.tags.push(keywords[i].textContent);
	}

	//add "Book Reviews" tag, if found
	let sectionheading = ZU.xpathText(doc, '//div[@class="toc-heading"]');
	if (sectionheading) {
		sectionheading = sectionheading.trim();
		if (sectionheading.match(/^Book\s+Reviews?$/i))
			item.tags.push("Book Reviews");
	}
	
	// numbering issues with slash, e.g. in case of  double issue "1-2" > "1/2"
	if (item.issue) item.issue = item.issue.replace('-', '/');
	
	//scraping orcid number 
	let authorSectionEntries = ZU.xpath(doc, '//*[contains(@class, "contribDegrees")]');//Z.debug(authorSectionEntries)
	for (let authorSectionEntry of authorSectionEntries) {
		let authorInfo = authorSectionEntry.querySelector('.entryAuthor');
		let orcidHref = authorSectionEntry.querySelector('.orcid-author');
		if (authorInfo && orcidHref) {
			let author = authorInfo.childNodes[0].textContent;
			let orcid = orcidHref.textContent.replace(/.*(\d{4}-\d{4}-\d{4}-\d+x?)$/i, '$1');
			item.notes.push({note: "orcid:" + orcid + ' | ' + author});
		}
	}
	//deduplicate
	item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
	
	// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access
	let AccessIconLocation = doc.querySelector('.accessIconLocation[alt]');
	if (AccessIconLocation && AccessIconLocation.alt.match(/open\s+access/gi)) item.notes.push('LF:');

	//add attachments
	item.attachments = [];

	item.complete();
}




/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Informality and productivity in the labor market in Peru",
				"creators": [
					{
						"lastName": "Chong",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Galdo",
						"firstName": "Jose",
						"creatorType": "author"
					},
					{
						"lastName": "Saavedra",
						"firstName": "Jaime",
						"creatorType": "author"
					}
				],
				"date": "Dezember 1, 2008",
				"DOI": "10.1080/17487870802543480",
				"ISSN": "1748-7870",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"issue": "4",
				"itemID": "doi:10.1080/17487870802543480",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "229-245",
				"publicationTitle": "Journal of Economic Policy Reform",
				"url": "https://doi.org/10.1080/17487870802543480",
				"volume": "11",
				"attachments": [],
				"tags": [
					{
						"tag": "Peru"
					},
					{
						"tag": "employment"
					},
					{
						"tag": "informality"
					},
					{
						"tag": "labor costs"
					},
					{
						"tag": "training"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/toc/clah20/22/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/17487870802543480",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Informality and productivity in the labor market in Peru",
				"creators": [
					{
						"lastName": "Chong",
						"firstName": "Alberto",
						"creatorType": "author"
					},
					{
						"lastName": "Galdo",
						"firstName": "Jose",
						"creatorType": "author"
					},
					{
						"lastName": "Saavedra",
						"firstName": "Jaime",
						"creatorType": "author"
					}
				],
				"date": "Dezember 1, 2008",
				"DOI": "10.1080/17487870802543480",
				"ISSN": "1748-7870",
				"abstractNote": "This article analyzes the evolution of informal employment in Peru from 1986 to 2001. Contrary to what one would expect, the informality rates increased steadily during the 1990s despite the introduction of flexible contracting mechanisms, a healthy macroeconomic recovery, and tighter tax codes and regulation. We explore different factors that may explain this upward trend including the role of labor legislation and labor allocation between/within sectors of economic activity. Finally, we illustrate the negative correlation between productivity and informality by evaluating the impacts of the Youth Training PROJOVEN Program that offers vocational training to disadvantaged young individuals. We find significant training impacts on the probability of formal employment for both males and females.",
				"issue": "4",
				"itemID": "doi:10.1080/17487870802543480",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "229-245",
				"publicationTitle": "Journal of Economic Policy Reform",
				"url": "https://doi.org/10.1080/17487870802543480",
				"volume": "11",
				"attachments": [],
				"tags": [
					{
						"tag": "Peru"
					},
					{
						"tag": "employment"
					},
					{
						"tag": "informality"
					},
					{
						"tag": "labor costs"
					},
					{
						"tag": "training"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/00036846.2011.568404",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Estimating willingness to pay by risk adjustment mechanism",
				"creators": [
					{
						"firstName": "Joo Heon",
						"lastName": "Park",
						"creatorType": "author"
					},
					{
						"firstName": "Douglas L.",
						"lastName": "MacLachlan",
						"creatorType": "author"
					}
				],
				"date": "Januar 1, 2013",
				"DOI": "10.1080/00036846.2011.568404",
				"ISSN": "0003-6846",
				"abstractNote": "Measuring consumers’ Willingness To Pay (WTP) without considering the level of uncertainty in valuation and the consequent risk premiums will result in estimates that are biased toward lower values. This research proposes a model and method for correctly assessing WTP in cases involving valuation uncertainty. The new method, called Risk Adjustment Mechanism (RAM), is presented theoretically and demonstrated empirically. It is shown that the RAM outperforms the traditional method for assessing WTP, especially in a context of a nonmarket good such as a totally new product.",
				"issue": "1",
				"itemID": "doi:10.1080/00036846.2011.568404",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "37-46",
				"publicationTitle": "Applied Economics",
				"url": "https://doi.org/10.1080/00036846.2011.568404",
				"volume": "45",
				"attachments": [],
				"tags": [
					{
						"tag": "D12"
					},
					{
						"tag": "D81"
					},
					{
						"tag": "M31"
					},
					{
						"tag": "adjustment mechanism"
					},
					{
						"tag": "contigent valuation method"
					},
					{
						"tag": "purchase decisions"
					},
					{
						"tag": "willingness to pay"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.nejm.org/toc/nejm/medical-journal",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.nejm.org/doi/full/10.1056/NEJMp1207920",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Cutting Family Planning in Texas",
				"creators": [
					{
						"firstName": "Kari",
						"lastName": "White",
						"creatorType": "author"
					},
					{
						"firstName": "Daniel",
						"lastName": "Grossman",
						"creatorType": "author"
					},
					{
						"firstName": "Kristine",
						"lastName": "Hopkins",
						"creatorType": "author"
					},
					{
						"firstName": "Joseph E.",
						"lastName": "Potter",
						"creatorType": "author"
					}
				],
				"date": "September 27, 2012",
				"DOI": "10.1056/NEJMp1207920",
				"ISSN": "0028-4793",
				"abstractNote": "Four fundamental principles drive public funding for family planning. First, unintended pregnancy is associated with negative health consequences, including reduced use of prenatal care, lower breast-feeding rates, and poor maternal and neonatal outcomes.1,2 Second, governments realize substantial cost savings by investing in family planning, which reduces the rate of unintended pregnancies and the costs of prenatal, delivery, postpartum, and infant care.3 Third, all Americans have the right to choose the timing and number of their children. And fourth, family planning enables women to attain their educational and career goals and families to provide for their children. These principles led . . .",
				"extra": "PMID: 23013071",
				"issue": "13",
				"itemID": "doi:10.1056/NEJMp1207920",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "1179-1181",
				"publicationTitle": "New England Journal of Medicine",
				"url": "https://doi.org/10.1056/NEJMp1207920",
				"volume": "367",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/abs/10.1080/0308106032000167373",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Multicriteria Evaluation of High-speed Rail, Transrapid Maglev and Air Passenger Transport in Europe",
				"creators": [
					{
						"firstName": "Milan",
						"lastName": "Janic",
						"creatorType": "author"
					}
				],
				"date": "Dezember 1, 2003",
				"DOI": "10.1080/0308106032000167373",
				"ISSN": "0308-1060",
				"abstractNote": "This article deals with a multicriteria evaluation of High-Speed Rail, Transrapid Maglev and Air Passenger Transport in Europe. Operational, socio-economic and environmental performance indicators of the specific high-speed transport systems are adopted as the evaluation criteria. By using the entropy method, weights are assigned to particular criteria in order to indicate their relative importance in decision-making. The TOPSIS method is applied to carry out the multicriteria evaluation and selection of the preferable alternative (high-speed system) under given circumstances.",
				"issue": "6",
				"itemID": "doi:10.1080/0308106032000167373",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "491-512",
				"publicationTitle": "Transportation Planning and Technology",
				"url": "https://doi.org/10.1080/0308106032000167373",
				"volume": "26",
				"attachments": [],
				"tags": [
					{
						"tag": "Entropy method; "
					},
					{
						"tag": "Europe; "
					},
					{
						"tag": "High-speed transport systems; "
					},
					{
						"tag": "Interest groups "
					},
					{
						"tag": "Multicriteria analysis; "
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/action/doSearch?AllField=labor+market",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/abs/10.1080/00380768.1991.10415050#.U_vX3WPATVE",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Concentration dependence of CO2 evolution from soil in chamber with low CO2 concentration (< 2,000 ppm), and CO2 diffusion/sorption model in soil",
				"creators": [
					{
						"firstName": "Takahiko",
						"lastName": "Naganawa",
						"creatorType": "author"
					},
					{
						"firstName": "Kazutake",
						"lastName": "Kyuma",
						"creatorType": "author"
					}
				],
				"date": "September 1, 1991",
				"DOI": "10.1080/00380768.1991.10415050",
				"ISSN": "0038-0768",
				"abstractNote": "Concentration dependence of CO2 evolution from soil was studied under field and laboratory conditions. Under field conditions, when the CO2 concentration was measured with an infrared gas analyzer (IRGA) in a small and column-shaped chamber placed on the ground, the relationship among the CO2 concentration c (m3 m-3), time t (h), height of the chamber h, a constant rate of CO2 evolution from the soil v (m3 m-2 h-1), and an appropriate constant k, was expressed by the following equation, d c/d t = v/ h—k(c— a) (c=a at t = 0). Although most of the data of measured CO2 evolution fitted to this equation, the applicability of the equation was limited to the data to which a linear equation could not be fitted, because the estimated value of v had a larger error than that estimated by linear regression analysis, as observed by computer simulation. The concentration dependence shown above and some other variations were analyzed based on a sorption/diffusion model, i.e. they were associated with CO2-sorption by the soil and modified by the conditions of CO2 diffusion in the soil.",
				"issue": "3",
				"itemID": "doi:10.1080/00380768.1991.10415050",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "381-386",
				"publicationTitle": "Soil Science and Plant Nutrition",
				"url": "https://doi.org/10.1080/00380768.1991.10415050",
				"volume": "37",
				"attachments": [],
				"tags": [
					{
						"tag": "CO2 diffusion"
					},
					{
						"tag": "CO2 evolution"
					},
					{
						"tag": "CO2 sorption"
					},
					{
						"tag": "concentration dependence"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.tandfonline.com/doi/figure/10.1080/00014788.2016.1157680?scroll=top&needAccess=true",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Stakeholder perceptions of performance audit credibility",
				"creators": [
					{
						"firstName": "Warwick",
						"lastName": "Funnell",
						"creatorType": "author"
					},
					{
						"firstName": "Margaret",
						"lastName": "Wade",
						"creatorType": "author"
					},
					{
						"firstName": "Robert",
						"lastName": "Jupe",
						"creatorType": "author"
					}
				],
				"date": "September 18, 2016",
				"DOI": "10.1080/00014788.2016.1157680",
				"ISSN": "0001-4788",
				"abstractNote": "This paper examines the credibility of performance audit at the micro-level of practice using the general framework of Birnbaum and Stegner's theory of source credibility in which credibility is dependent upon perceptions of the independence of the auditors, their technical competence and the usefulness of audit findings. It reports the results of a field study of a performance audit by the Australian National Audit Office conducted in a major government department. The paper establishes that problems of auditor independence, technical competence and perceived audit usefulness continue to limit the credibility of performance auditing.",
				"issue": "6",
				"itemID": "doi:10.1080/00014788.2016.1157680",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "601-619",
				"publicationTitle": "Accounting and Business Research",
				"url": "http://dx.doi.org/10.1080/00014788.2016.1157680",
				"volume": "46",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot"
					}
				],
				"tags": [
					"Australian National Audit Office",
					"credibility",
					"performance auditing",
					"source"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/14755610.2019.1572099",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "(Un)believing in modern society: religion, spirituality, and religious-secular competition",
				"creators": [
					{
						"firstName": "Claire",
						"lastName": "Wanless",
						"creatorType": "author"
					}
				],
				"date": "Januar 2, 2019",
				"DOI": "10.1080/14755610.2019.1572099",
				"ISSN": "1475-5610",
				"issue": "1",
				"itemID": "doi:10.1080/14755610.2019.1572099",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "124-128",
				"publicationTitle": "Culture and Religion",
				"shortTitle": "(Un)believing in modern society",
				"url": "https://doi.org/10.1080/14755610.2019.1572099",
				"volume": "20",
				"attachments": [],
				"tags": [
					{
						"tag": "Book Review"
					},
					{
						"tag": "Book Reviews"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/15570274.2021.1874144",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Taiwan’s Covenantal Pluralism",
				"creators": [
					{
						"firstName": "André",
						"lastName": "Laliberté",
						"creatorType": "author"
					}
				],
				"date": "Januar 2, 2021",
				"DOI": "10.1080/15570274.2021.1874144",
				"ISSN": "1557-0274",
				"abstractNote": "Despite its diplomatic isolation, Taiwan shines in East Asia as a beacon for pluralism. This is a rare example of a progressive and liberal society where both deep religious diversity and a tolerant secular state co-exist. Taiwan’s liminality between world empires, and its unique position in the global economy partly explain its openness to a diversity of worldviews, but also exposes it to greater challenges to achieve covenantal pluralism. Taiwan’s hard-won democracy has entrenched positive trends, but three issues threaten to undermine it: the political pressure of a domineering China that limits its own religious diversity and that wants to annex Taiwan; the rise in influence of a rather intransigent and divisive religious minority that demonizes its opponents; and the increasing labor immigration addressing the challenges of an aging society.",
				"issue": "1",
				"itemID": "doi:10.1080/15570274.2021.1874144",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "42-55",
				"publicationTitle": "The Review of Faith & International Affairs",
				"url": "https://doi.org/10.1080/15570274.2021.1874144",
				"volume": "19",
				"attachments": [],
				"tags": [
					{
						"tag": "Buddhism"
					},
					{
						"tag": "Christianity"
					},
					{
						"tag": "Confucianism"
					},
					{
						"tag": "Taiwan"
					},
					{
						"tag": "democratization"
					},
					{
						"tag": "religious diversity"
					},
					{
						"tag": "religious freedom"
					},
					{
						"tag": "self-determination"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0003-3285-5188 | André Laliberté"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.tandfonline.com/doi/full/10.1080/0048721X.2020.1792051",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Engineering transformations in the ‘religion-development nexus’: Islamic law, reform, and reconstruction in Aceh",
				"creators": [
					{
						"firstName": "R. Michael",
						"lastName": "Feener",
						"creatorType": "author"
					}
				],
				"date": "Januar 2, 2021",
				"DOI": "10.1080/0048721X.2020.1792051",
				"ISSN": "0048-721X",
				"abstractNote": "This article presents an exploration of the ways in which law, education, and religious propagation have been deployed as mutually reinforcing means for engineering social transformation in the Indonesian province of Aceh, and how these agendas were dramatically accelerated in the context of humanitarian and development interventions in post-conflict/post-disaster reconstruction. In doing so, it demonstrates and critically analyzes the ways in which contemporary Muslim visions of instrumentalist, future-oriented models of Islamic law have been formally implemented through the apparatus of the state as part of an over-arching project of engineering a new society, and of redefining conceptions of proper Islamic religious belief and practice. This case presents a striking instance of an agenda of religious revival envisioned not as an attempt to preserve or resuscitate established tradition, but rather as a tool in interventions for future-oriented projects for ‘improving’ the conditions of Muslims in both this world, and the next.",
				"issue": "1",
				"itemID": "doi:10.1080/0048721X.2020.1792051",
				"libraryCatalog": "Taylor and Francis+NEJM",
				"pages": "40-57",
				"publicationTitle": "Religion",
				"shortTitle": "Engineering transformations in the ‘religion-development nexus’",
				"url": "https://doi.org/10.1080/0048721X.2020.1792051",
				"volume": "51",
				"attachments": [],
				"tags": [
					{
						"tag": "Aceh"
					},
					{
						"tag": "Indonesia"
					},
					{
						"tag": "Islam"
					},
					{
						"tag": "Shari’a"
					},
					{
						"tag": "Southeast Asia"
					},
					{
						"tag": "social engineering"
					}
				],
				"notes": [
					{
						"note": "orcid:0000-0002-1222-6766 | R. Michael Feener"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
