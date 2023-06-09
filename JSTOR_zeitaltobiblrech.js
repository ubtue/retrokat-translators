{
	"translatorID": "7d7d0060-3d29-4ccf-8d1d-6d85178c64a2",
	"label": "JSTOR_zeitaltobiblrech",
	"creator": "Helena Nebel",
	"target": "www.jstor.org\\/.+\\/zeitaltobiblrech",
	"minVersion": "3.0.12",
	"maxVersion": "",
	"priority": 150,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-14 12:47:54"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Simon Kornblith, Sean Takats, Michael Berkowitz, Eli Osherovich, czar

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

var items = {};
var reviewURLs = [];

function detectWeb(doc, url) {
	// See if this is a search results page or Issue content
	if (doc.title == "JSTOR: Search Results") {
		return getSearchResults(doc, true) ? "multiple" : false;
	}
	else if (/stable|pss/.test(url) // Issues with DOIs can't be identified by URL
		&& getSearchResults(doc, true)) {
		return "multiple";
	}

	
	else {
			return "journalArticle";
		}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var resultsBlock = ZU.xpath(doc, '//div[contains(@class, "media-body")]')
	if (!resultsBlock) return false;
	let found = false;
	for (let i=0; i<resultsBlock.length; i++) {
		let node = resultsBlock[i];
		let link = ZU.xpath(node, './/a[@data-qa="content title"]');
		let title = link[0].textContent.trim();
		let href = link[0].href;
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	//Z.debug(ZU.xpathText(doc, '//div [@class="small-12 columns mvs"]'));
	for (let section of ZU.xpath(doc, '//div [@class="small-12 columns mvs"]')) {
		
		if (ZU.xpathText(section, './/h3[@class="mln"]') != null) {
			if (ZU.xpathText(section, './/h3[@class="mln"]').match(/Rezension/) != null) {
				for (let tag of ZU.xpath(section, './/div[contains(@class, "media-body")]//a[@data-qa="content title"]')) {
					let url = ZU.xpathText(tag, './@href');
					reviewURLs.push("https://www.jstor.org" + url);
				}
			}
		}
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc), function (selectedItems) {
			if (!selectedItems) {
				return true;
			}
			for (let j in selectedItems) {
				scrapeSinglePage(j);
			}
		});
	}
}

function convertCharRefs(string) {
	// converts hex decimal encoded html entities used by JSTOR to regular utf-8
	return string
		.replace(/&#x([A-Za-z0-9]+);/g, function (match, num) {
			return String.fromCharCode(parseInt(num, 16));
		});
}

function scrapeSinglePage(j) {
	risURL = j.replace("/stable/", "/citation/ris/");
	ZU.doGet(risURL, function(text) {
		processRIS(text, j);
	});
}

function processRIS(text, j) {
	// load translator for RIS
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	//Reviews have a RI tag now (official RIS for Reviewed Item)
	var review = text.match(/^RI\s+-\s+(.+)/m);
	// sometimes we have subtitles stored in T1. These are part of the title, we want to add them later
	var subtitle = text.match(/^T1\s+-\s+(.+)/m);
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		
		// author names are not (always) supplied as lastName, firstName in RIS
		// we fix it here (note sure if still need with new RIS)
		var m;
		for (var i = 0, n = item.creators.length; i < n; i++) {
			if (!item.creators[i].firstName
				&& (m = item.creators[i].lastName.match(/^(.+)\s+(\S+)$/))) {
				item.creators[i].firstName = m[1];
				item.creators[i].lastName = m[2];
				delete item.creators[i].fieldMode;
			}
		}
		let newCreators = [];
		for (let creator of item.creators) {
			if (creator.creatorType == "author") {
				newCreators.push(creator);
			}
		}
		
		// fix special characters in abstract, convert html linebreaks and italics, remove stray p tags; don't think they use anything else
		if (item.abstractNote) {
			item.abstractNote = convertCharRefs(item.abstractNote);
			item.abstractNote = item.abstractNote
									.replace(/<\/p><p>/g, "\n")
									.replace(/<em>(.+?)<\/em>/g, " <i>$1</i> ")
									.replace(/<\/?p>/g, "")
									.replace(/^\[/, "")
									.replace(/\]$/, "")
									.replace(/ABSTRACT/, "")
									.trim();
		}
		
		item.attachments = [];
		if (item.ISSN) {
			item.ISSN = ZU.cleanISSN(item.ISSN);
		}
		
		if (subtitle){
			item.title = item.title + ": " + subtitle[1]
		}
		item.url = item.url.replace('http:', 'https:'); // RIS still lists http addresses while JSTOR's stable URLs use https
		if (item.title == undefined) {
			if (review != null) {
				item.creators = item.creators.slice(0,1);
				if (items[item.url].split(/\n\s+by\s+/).length == 2) {
					let reviewed_title = items[item.url].split(/\n\s+by\s+/)[0];
					let reviewed_authors = items[item.url].split(/\n\s+by\s+/)[1];
					let reviewed_author = "";
					for (let author of reviewed_authors.split(/(?:, )|(?: \/ )/)) {
						let cleanAuthor = ZU.cleanAuthor(author, 'author');
						reviewed_author += cleanAuthor.lastName + ', ' + cleanAuthor.firstName + '::';
					}
					reviewed_author = reviewed_author.replace(/(?:::$)|(?: \(.+?\))/g, "");
					item.tags.push('#reviewed_pub#title::' + reviewed_title + '#name::' + reviewed_author + '#');
					item.tags.push('Book Review');
				}
			}
			item.title = items[item.url].replace(/\n\s*/g, " ");
		}
		if (reviewURLs.includes(item.url)) item.tags.push('Book Review');
		if (ZU.xpathText(doc, '//script[@data-analytics-provider="ga"]') != null) {
			if (ZU.xpathText(doc, '//script[@data-analytics-provider="ga"]').match('"userAuthorization" : "Free')) {
				item.notes.push({note: 'LF:'});
			}
		}
		item.creators = newCreators;
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doImport();
	});
}








/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://www.jstor.org/action/doBasicSearch?Query=chicken&Search.x=0&Search.y=0&wc=on",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/1593514?&Search=yes&searchText=chicken&list=hide&searchUri=%2Faction%2FdoBasicSearch%3FQuery%3Dchicken%26Search.x%3D0%26Search.y%3D0%26wc%3Don&prevSearch=&item=1&ttl=70453&returnArticleService=showFullText",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Chicken Primary Enterocytes: Inhibition of Eimeria tenella Replication after Activation with Crude Interferon-γ Supernatants",
				"creators": [
					{
						"lastName": "Dimier-Poisson",
						"firstName": "I. H.",
						"creatorType": "author"
					},
					{
						"lastName": "Bout",
						"firstName": "D. T.",
						"creatorType": "author"
					},
					{
						"lastName": "Quéré",
						"firstName": "P.",
						"creatorType": "author"
					}
				],
				"date": "2004",
				"ISSN": "0005-2086",
				"abstractNote": "A reproducible and original method for the preparation of chicken intestine epithelial cells from 18-day-old embryos for long-term culture was obtained by using a mechanical isolation procedure, as opposed to previous isolation methods using relatively high concentrations of trypsin, collagenase, or EDTA. Chicken intestine epithelial cells typically expressed keratin and chicken E-cadherin, in contrast to chicken embryo fibroblasts, and they increased cell surface MHC II after activation with crude IFN-γ containing supernatants, obtained from chicken spleen cells stimulated with concanavalin A or transformed by reticuloendotheliosis virus. Eimeria tenella was shown to be able to develop until the schizont stage after 46 hr of culture in these chicken intestinal epithelial cells, but it was not able to develop further. However, activation with IFN-γ containing supernatants resulted in strong inhibition of parasite replication, as shown by incorporation of [3 H]uracil. Thus, chicken enterocytes, which are the specific target of Eimeria development in vivo, could be considered as potential local effector cells involved in the protective response against this parasite. /// Se desarrolló un método reproducible y original para la preparación de células epiteliales de intestino de embriones de pollo de 18 días de edad para ser empleadas como cultivo primario de larga duración. Las células epiteliales de intestino fueron obtenidas mediante un procedimiento de aislamiento mecánico, opuesto a métodos de aislamientos previos empleando altas concentraciones de tripsina, colagenasa o EDTA. Las células epiteliales de intestino expresaron típicamente keratina y caderina E, a diferencia de los fibroblastos de embrión de pollo, e incrementaron el complejo mayor de histocompatibilidad tipo II en la superficie de la célula posterior a la activación con sobrenadantes de interferón gamma. Los sobrenadantes de interferón gamma fueron obtenidos a partir de células de bazos de pollos estimuladas con concanavalina A o transformadas con el virus de reticuloendoteliosis. Se observó el desarrollo de la Eimeria tenella hasta la etapa de esquizonte después de 46 horas de cultivo en las células intestinales epiteliales de pollo pero no se observó un desarrollo posterior. Sin embargo, la activación de los enterocitos con los sobrenadantes con interferón gamma resultó en una inhibición fuerte de la replicación del parásito, comprobada mediante la incorporación de uracilo [3 H]. Por lo tanto, los enterocitos de pollo, blanco específico del desarrollo in vivo de la Eimeria, podrían ser considerados como células efectoras locales, involucradas en la respuesta protectora contra este parásito.",
				"archive": "JSTOR",
				"issue": "3",
				"libraryCatalog": "JSTOR",
				"pages": "617-624",
				"publicationTitle": "Avian Diseases",
				"shortTitle": "Chicken Primary Enterocytes",
				"url": "https://www.jstor.org/stable/1593514",
				"volume": "48",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/10.1086/245591?&Search=yes&searchText=bread&searchText=engel&searchText=alpern&searchText=barbara&searchText=alone&list=hide&searchUri=%2Faction%2FdoAdvancedSearch%3Fq0%3Dnot%2Bby%2Bbread%2Balone%26f0%3Dall%26c1%3DAND%26q1%3Dbarbara%2Balpern%2Bengel%26f1%3Dall%26acc%3Don%26wc%3Don%26Search%3DSearch%26sd%3D%26ed%3D%26la%3D%26jo%3D&prevSearch=&item=2&ttl=82&returnArticleService=showFullText",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Not by Bread Alone: Subsistence Riots in Russia during World War I",
				"creators": [
					{
						"lastName": "Engel",
						"firstName": "Barbara Alpern",
						"creatorType": "author"
					}
				],
				"date": "1997",
				"DOI": "10.1086/245591",
				"ISSN": "0022-2801",
				"issue": "4",
				"libraryCatalog": "JSTOR",
				"pages": "696-721",
				"publicationTitle": "The Journal of Modern History",
				"shortTitle": "Not by Bread Alone",
				"url": "https://www.jstor.org/stable/10.1086/245591",
				"volume": "69",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/10.1086/508232",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Remaking Families: A Review Essay",
				"creators": [
					{
						"lastName": "Satz",
						"firstName": "Debra",
						"creatorType": "author"
					}
				],
				"date": "2007",
				"DOI": "10.1086/508232",
				"ISSN": "0097-9740",
				"issue": "2",
				"libraryCatalog": "JSTOR",
				"pages": "523-538",
				"publicationTitle": "Signs",
				"shortTitle": "Remaking Families",
				"url": "https://www.jstor.org/stable/10.1086/508232",
				"volume": "32",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/131548",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "[Rezension von: Solomon, Peter H., Soviet Criminal Justice under Stalin]",
				"creators": [
					{
						"lastName": "Burbank",
						"firstName": "Jane",
						"creatorType": "author"
					}
				],
				"date": "1998",
				"ISSN": "0036-0341",
				"archive": "JSTOR",
				"issue": "2",
				"libraryCatalog": "JSTOR",
				"pages": "310-311",
				"publicationTitle": "The Russian Review",
				"shortTitle": "[Rezension von",
				"url": "https://www.jstor.org/stable/131548",
				"volume": "57",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Soviet Criminal Justice under Stalin#name::Solomon, Peter H.#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/40398803",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Coauthorship Dynamics and Knowledge Capital: The Patterns of Cross-Disciplinary Collaboration in Information Systems Research",
				"creators": [
					{
						"lastName": "Oh",
						"firstName": "Wonseok",
						"creatorType": "author"
					},
					{
						"lastName": "Choi",
						"firstName": "Jin Nam",
						"creatorType": "author"
					},
					{
						"lastName": "Kim",
						"firstName": "Kimin",
						"creatorType": "author"
					}
				],
				"date": "2005",
				"ISSN": "0742-1222",
				"abstractNote": "From the social network perspective, this study explores the ontological structure of knowledge sharing activities engaged in by researchers in the field of information systems (IS) over the past three decades. We construct a knowledge network based on coauthorship patterns extracted from four major journals in the IS field in order to analyze the distinctive characteristics of each subfield and to assess the amount of internal and external knowledge exchange that has taken place among IS researchers. This study also tests the role of different types of social capital that influence the academic impact of researchers. Our results indicate that the proportion of coauthored IS articles in the four journals has doubled over the past 25 years, from merely 40 percent in 1978 to over 80 percent in 2002. However, a significant variation exists in terms of the shape, density, and centralization of knowledge exchange networks across the four subfields of IS—namely, behavioral science, organizational science, computer science, and economic science. For example, the behavioral science subgroup, in terms of internal cohesion among researchers, tends to develop the most dense collaborative relationships, whereas the computer science subgroup is the most fragmented. Moreover, external collaboration across these subfields appears to be limited and severely unbalanced. Across the four subfields, on average, less than 20 percent of the research collaboration ties involved researchers from different subdisciplines. Finally, the regression analysis reveals that knowledge capital derived from a network rich in structural holes has a positive influence on an individual researcher's academic performance.",
				"archive": "JSTOR",
				"issue": "3",
				"libraryCatalog": "JSTOR",
				"pages": "265-292",
				"publicationTitle": "Journal of Management Information Systems",
				"shortTitle": "Coauthorship Dynamics and Knowledge Capital",
				"url": "https://www.jstor.org/stable/40398803",
				"volume": "22",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/action/doBasicSearch?Query=%28solomon+criminal+justice%29+AND+disc%3A%28slavicstudies-discipline+OR+history-discipline%29&prq=%28criminal+justice%29+AND+disc%3A%28slavicstudies-discipline+OR+history-discipline%29&hp=25&acc=on&wc=on&fc=off&so=rel&racc=off",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/10.1525/rep.2014.128.1.1#page_scan_tab_contents",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“Judaism” as Political Concept: Toward a Critique of Political Theology",
				"creators": [
					{
						"lastName": "Nirenberg",
						"firstName": "David",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1525/rep.2014.128.1.1",
				"ISSN": "0734-6018",
				"abstractNote": "This article traces a long history in Christian political thought of linking politics, statecraft, and worldly authority to the broader category of carnal literalism, typed as “Jewish” by the Pauline tradition. This tradition produced a tendency to discuss political error in terms of Judaism, with the difference between mortal and eternal, private and public, tyrant and legitimate monarch, mapped onto the difference between Jew and Christian. As a result of this history, transcendence as a political ideal has often figured (and perhaps still figures?) its enemies as Jewish.",
				"issue": "1",
				"libraryCatalog": "JSTOR",
				"pages": "1-29",
				"publicationTitle": "Representations",
				"shortTitle": "“Judaism” as Political Concept",
				"url": "https://www.jstor.org/stable/10.1525/rep.2014.128.1.1",
				"volume": "128",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/10.1086/378695",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Salaries, Turnover, and Performance in the Federal Criminal Justice System",
				"creators": [
					{
						"lastName": "Boylan",
						"firstName": "Richard T.",
						"creatorType": "author"
					}
				],
				"date": "2004",
				"DOI": "10.1086/378695",
				"ISSN": "0022-2186",
				"abstractNote": "Abstract The effect of salaries on turnover and performance is analyzed for U.S. attorneys in office during the years 1969 through 1999. Lower salaries are shown to increase the turnover of U.S. attorneys, and higher turnover is shown to reduce output. Two features distinguish U.S. attorneys (chief federal prosecutors) from other public‐ and private‐sector employees. First, since 1977, U.S. attorney salaries have been tied to the salaries of members of Congress and are thus exogenously determined. Second, there are public measures for the output of U.S. attorneys. Both features simplify the study of the effect of salaries on turnover and performance.",
				"issue": "1",
				"libraryCatalog": "JSTOR",
				"pages": "75-92",
				"publicationTitle": "The Journal of Law & Economics",
				"url": "https://www.jstor.org/stable/10.1086/378695",
				"volume": "47",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/stable/i250748",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/10.7312/kara15848",
		"items": [
			{
				"itemType": "book",
				"title": "Bonded Labor: Tackling the System of Slavery in South Asia",
				"creators": [
					{
						"lastName": "Kara",
						"firstName": "Siddharth",
						"creatorType": "author"
					}
				],
				"date": "2012",
				"abstractNote": "Siddharth Kara's <i>Sex Trafficking</i> has become a critical resource for its revelations into an unconscionable business, and its detailed analysis of the trade's immense economic benefits and human cost. This volume is Kara's second, explosive study of slavery, this time focusing on the deeply entrenched and wholly unjust system of bonded labor.  Drawing on eleven years of research in India, Nepal, Bangladesh, and Pakistan, Kara delves into an ancient and ever-evolving mode of slavery that ensnares roughly six out of every ten slaves in the world and generates profits that exceeded $17.6 billion in 2011. In addition to providing a thorough economic, historical, and legal overview of bonded labor, Kara travels to the far reaches of South Asia, from cyclone-wracked southwestern Bangladesh to the Thar desert on the India-Pakistan border, to uncover the brutish realities of such industries as hand-woven-carpet making, tea and rice farming, construction, brick manufacture, and frozen-shrimp production. He describes the violent enslavement of millions of impoverished men, women, and children who toil in the production of numerous products at minimal cost to the global market. He also follows supply chains directly to Western consumers, vividly connecting regional bonded labor practices to the appetites of the world. Kara's pioneering analysis encompasses human trafficking, child labor, and global security, and he concludes with specific initiatives to eliminate the system of bonded labor from South Asia once and for all.",
				"archive": "JSTOR",
				"libraryCatalog": "JSTOR",
				"publisher": "Columbia University Press",
				"shortTitle": "Bonded Labor",
				"url": "https://www.jstor.org/stable/10.7312/kara15848",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/stable/j.ctt7ztj7f?seq=1#page_scan_tab_contents",
		"items": [
			{
				"itemType": "book",
				"title": "Ulysses' Sail: An Ethnographic Odyssey of Power, Knowledge, and Geographical Distance",
				"creators": [
					{
						"lastName": "Helms",
						"firstName": "Mary W.",
						"creatorType": "author"
					}
				],
				"date": "1988",
				"abstractNote": "What do long-distance travelers gain from their voyages, especially when faraway lands are regarded as the source of esoteric knowledge? Mary Helms explains how various cultures interpret space and distance in cosmological terms, and why they associate political power with information about strange places, peoples, and things. She assesses the diverse goals of travelers, be they Hindu pilgrims in India, Islamic scholars of West Africa, Navajo traders, or Tlingit chiefs, and discusses the most extensive experience of longy2Ddistance contact on record--that between Europeans and native peoples--and the clash of cultures that arose from conflicting expectations about the \"faraway.\".  The author describes her work as \"especially concerned with the political and ideological contexts or auras within which long-distance interests and activities may be conducted .. Not only exotic materials but also intangible knowledge of distant realms and regions can be politically valuable `goods,' both for those who have endured the perils of travel and for those sedentary homebodies who are able to acquire such knowledge by indirect means and use it for political advantage.\"  Originally published in 1988.  ThePrinceton Legacy Libraryuses the latest print-on-demand technology to again make available previously out-of-print books from the distinguished backlist of Princeton University Press. These paperback editions preserve the original texts of these important books while presenting them in durable paperback editions. The goal of the Princeton Legacy Library is to vastly increase access to the rich scholarly heritage found in the thousands of books published by Princeton University Press since its founding in 1905.",
				"archive": "JSTOR",
				"libraryCatalog": "JSTOR",
				"publisher": "Princeton University Press",
				"shortTitle": "Ulysses' Sail",
				"url": "https://www.jstor.org/stable/j.ctt7ztj7f",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.jstor.org/action/doAdvancedSearch?q3=&re=on&q4=&f3=all&c3=AND&group=none&q1=&f5=all&c5=AND&la=&q2=&c6=AND&sd=&c2=AND&c1=AND&pt=&acc=off&q6=&q5=&c4=AND&f6=all&f0=all&q0=%22Reading+Rousseau+in+the+nuclear+age%22&f4=all&ed=&f2=all&f1=all&isbn=",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://www.jstor.org/tc/accept?origin=/stable/pdf/4308405.pdf",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Errors in Bibliographic Citations: A Continuing Problem",
				"creators": [
					{
						"lastName": "Sweetland",
						"firstName": "James H.",
						"creatorType": "author"
					}
				],
				"date": "1989",
				"ISSN": "0024-2519",
				"abstractNote": "Bibliographic references are an accepted part of scholarly publication. As such, they have been used for information retrieval, studies of scientific communication, collection development decisions, and even determination of salary raises, as well as for their primary purpose of documentation of authors' claims. However, there appears to be a high percentage of errors in these citations, seen in evidence from the mid-nineteenth century to the present. Such errors can be traced to a lack of standardization in citation formats, misunderstanding of foreign languages, general human inabilities to reproduce long strings of information correctly, and failure to examine the document cited, combined with a general lack of training in the norms of citation. The real problem, the failure to detect and correct citation errors, is due to a diffusion of responsibility in the publishing process.",
				"archive": "JSTOR",
				"issue": "4",
				"libraryCatalog": "JSTOR",
				"pages": "291-304",
				"publicationTitle": "The Library Quarterly: Information, Community, Policy",
				"shortTitle": "Errors in Bibliographic Citations",
				"url": "https://www.jstor.org/stable/4308405",
				"volume": "59",
				"attachments": [
					{
						"title": "JSTOR Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
