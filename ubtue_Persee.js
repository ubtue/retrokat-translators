{
	"translatorID": "a467883b-95fe-48b6-a602-5a7b845aa052",
	"label": "ubtue_Persee",
	"creator": "Helena Nebel",
	"target": "www.persee.fr/(doc|issue)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-12 07:15:40"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/issue\//) && getSearchResults(doc)) return "multiple";
	else if (url.match(/\/doc\//)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="issue-document-title"]/a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function splitDotSeparatedKeywords(item) {
	if (item.ISSN === "2340-0080" && item.tags.length) {
		let split_tags = [];
		for (const tags of item.tags)
			split_tags.push(...tags.split('.'));
		item.tags = split_tags;
	}
	return item.tags;
}


// in some cases (issn == 1799-3121) the article's title is split in 2 parts
function joinTitleAndSubtitle (doc, item) {
	if (item.ISSN == '1799-3121') {
		if (doc.querySelector(".subtitle")) {
			item.title = item.title + ' ' + doc.querySelector(".subtitle").textContent.trim();
		}
	}
	return item.title;
}


function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.pages && i.pages.match(/^\d{1,3}–\d{1,3}-\d{1,3}–\d{1,3}/)) {
			let firstandlastpages = i.pages.split('–');
			i.pages = firstandlastpages[0] + '-' + firstandlastpages[2]; // Z.debug(item.pages)
		}
		
		if (i.issue === "0") delete i.issue;
		if (i.abstractNote && i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
		i.tags = splitDotSeparatedKeywords(i);
		i.title = joinTitleAndSubtitle(doc, i);
		// some journal assigns the volume to the date
		
		i.title = i.title.replace(/(<\/?[^>]+>)|(&nbsp;)/g, '');
		for (let abstract of ZU.xpath(doc, '//meta[@name="DC.Description"]/@content')) {
			abstract = abstract.textContent.replace(/(<\/?[^>]+>)|(&nbsp;)/g, '');
			if (i.abstractNote != abstract && abstract != "" && abstract != ".") {
				i.notes.push({note: "abs:" + abstract});
			}
		}
		if (ZU.xpathText(doc, '//meta[@name="DC.type"]/@content') != null) {
			if (ZU.xpathText(doc, '//meta[@name="DC.type"]/@content').match(/^(Comptes rendus)|(Vient de paraître)|(Reseñas)|(compterendu)|(rev$)/) != null) {
				i.tags.push("Book Review");
				let review_tag = ZU.xpath(doc, '//h2')[0];
				
				if (review_tag != undefined) {
					if (ZU.xpathText(review_tag, './em[1]') != null) {
						let reviewed_title = ZU.xpathText(review_tag, './em[1]');
						review_keyword = "#reviewed_pub#title::" + reviewed_title;
						let reviewed_author = review_tag.textContent.split(reviewed_title)[0].replace(/\.\s*—/g, '');
						let reviewed_author_string = "";
						for (let reviewed_aut of reviewed_author.split(/(?:,\s*)|(?:\s+et\s+)/g)) {
							splitted_author = ZU.cleanAuthor(reviewed_aut, 'author');
							reviewed_author_inverted = splitted_author.lastName + ", " + splitted_author.firstName;
							reviewed_author_string += reviewed_author_inverted + "::";
						}
						review_keyword += "#name::" + reviewed_author_string.replace(/(?:::,\s*::)|(?:::$)|(?:^,\s*::$)/g, '');
						let additional_information = review_tag.textContent.split(reviewed_title)[1];
						if (additional_information != undefined) {
								if (additional_information.match(/[^\d]\d{4}[^\d]/) != null) {
									let reviewed_year = additional_information.match(/[^\d](\d{4})[^\d]/)[1];
									review_keyword += "#year::" + reviewed_year;
								}
								else if (ZU.xpathText(doc, '//div[@itemprop="articleBody"]') != null) {
									if (ZU.xpathText(doc, '//div[@itemprop="articleBody"]').match(/[^\d]\d{4}[^\d]/) != null) {
									let reviewed_year = ZU.xpathText(doc, '//div[@itemprop="articleBody"]').match(/[^\d](\d{4})[^\d]/)[1];
									review_keyword += "#year::" + reviewed_year;
								}
								}
							}
							review_keyword += "#";
							review_keyword = ZU.trimInternal(review_keyword.replace(/(?:&nbsp;)/g, " ").replace(/(?:<\/?.+?>)/g, ""));
							i.tags.push(review_keyword);
					}
				}
				//getestet: https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0165_0000_7
				//https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8911_t1_0169_0000_8

				/*
				if (i.title.split('. — ').length == 2) {
					let reviewed_author = i.title.split('. — ')[0];
					let reviewed_titles = i.title.split('. — ')[1];
					if (reviewed_titles != null) {
						for (let reviewed_title of reviewed_titles.split(' ; ')) {
							review_keyword = "#reviewed_pub#title::" + reviewed_title.split(', ')[0];
							if (reviewed_author != null) {
								reviewed_author = reviewed_author.trim().replace(/,/, "").split(" et ")[0];
								splitted_author = ZU.cleanAuthor(reviewed_author, 'author');
								reviewed_author_inverted = splitted_author.lastName + ", " + splitted_author.firstName;
								review_keyword += "#name::" + reviewed_author_inverted;
							}
							if (reviewed_title.split(', ').length > 1) {
								if (reviewed_title.match(/[^\d]\d{4}[^\d]/) != null) {
									let reviewed_year = reviewed_title.match(/[^\d](\d{4})[^\d]/)[1];
									review_keyword += "#year::" + reviewed_year;
								}
							}
							review_keyword += "#";
							review_keyword = ZU.trimInternal(review_keyword.replace(/(?:&nbsp;)/g, " ").replace(/(?:<\/?.+?>)/g, ""));
							i.tags.push(review_keyword);
						}
					}
				}*/
			}
		}
		i.attachments = [];
		if (i.abstractNote != undefined) {
		if (i.abstractNote.match(/Archivo Teológico Granadino es una revista científica/) != null) {
			i.abstractNote = "";
		}
		}
		if (i.rights == "free") {
			i.notes.push('LF:');
		}
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else {
		invokeEMTranslator(doc, url);
	}
}






/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0165_0000_7",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "K. A. C. Creswell, The origin of the cruciform plan of Cairene Madrasas. — Le Caire, Imprimerie de l’Institut français, 1922",
				"creators": [
					{
						"firstName": "Gaston",
						"lastName": "Migeon",
						"creatorType": "author"
					}
				],
				"date": "1922",
				"issue": "2",
				"language": "fre",
				"libraryCatalog": "www.persee.fr",
				"pages": "165-166",
				"publicationTitle": "Syria. Archéologie, Art et histoire",
				"rights": "free",
				"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0165_0000_7",
				"volume": "3",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::The origin of the cruciform plan of Cairene Madrasas#name::Creswell, K. A. C.#year::1922#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8911_t1_0169_0000_8",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "P. Thomsen, Die lateinischen und griechischen Inschriften der Stadt Jerusalem und ihrer naechsten Umgebung, Extr. de Zeitschrift des deutschen Palaestina-Vereins, 1920 et 1921",
				"creators": [],
				"date": "1922",
				"issue": "2",
				"language": "fre",
				"libraryCatalog": "www.persee.fr",
				"pages": "169-170",
				"publicationTitle": "Syria. Archéologie, Art et histoire",
				"rights": "free",
				"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8911_t1_0169_0000_8",
				"volume": "3",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Die lateinischen und griechischen Inschriften der Stadt Jerusalem und ihrer naechsten Umgebung#name::Thomsen, P.#year::1920#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0167_0000_3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Encyclopédie de l'Islam . — Dictionnaire géographique, ethnographique et biographique des peuples musulmans, publié par M. Th. Houtsma, R. Basset, T. W. Arnold et H. Bauer, 26e livraison. Leyde, Brill ; Paris, Aug. Picard, 1921",
				"creators": [],
				"date": "1922",
				"issue": "2",
				"language": "fre",
				"libraryCatalog": "www.persee.fr",
				"pages": "167-168",
				"publicationTitle": "Syria. Archéologie, Art et histoire",
				"rights": "free",
				"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0167_0000_3",
				"volume": "3",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Encyclopédie de l'Islam . — Dictionnaire géographique, ethnographique et biographique des peuples musulmans#name::#year::1921#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.persee.fr/doc/syria_0039-7946_1960_num_37_1_5453_t1_0178_0000_2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "F. V. Winnett. — Safaitic Inscriptions from Jordan (Near and Middle East Series, 2).",
				"creators": [
					{
						"firstName": "Joseph Thadée",
						"lastName": "Milik",
						"creatorType": "author"
					}
				],
				"date": "1960",
				"issue": "1",
				"language": "fre",
				"libraryCatalog": "www.persee.fr",
				"pages": "178-181",
				"publicationTitle": "Syria. Archéologie, Art et histoire",
				"rights": "free",
				"url": "https://www.persee.fr/doc/syria_0039-7946_1960_num_37_1_5453_t1_0178_0000_2",
				"volume": "37",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title:: Safaitic Inscriptions from Jordan#name::Winnett, F. V.#year::1957#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0165_0000_3",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Carl Watzinger, Karl Wulzinger, Damaskus, die antike Stadt (Wiss. Veröff.d. deutsch-türkischen Denkmalschutz kommandos, hrsgg. von Th. Wiegand, Heft 4). — Berlin et Leipzig, W. de Gruyter, 1921",
				"creators": [
					{
						"firstName": "René",
						"lastName": "Dussaud",
						"creatorType": "author"
					}
				],
				"date": "1922",
				"issue": "2",
				"language": "fre",
				"libraryCatalog": "www.persee.fr",
				"pages": "165-165",
				"publicationTitle": "Syria. Archéologie, Art et histoire",
				"rights": "free",
				"url": "https://www.persee.fr/doc/syria_0039-7946_1922_num_3_2_8833_t1_0165_0000_3",
				"volume": "3",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Damaskus, die antike Stadt#name::Watzinger, Carl::Wulzinger, Karl#year::1921#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.persee.fr/doc/syria_0039-7946_1949_num_26_3_8413_t1_0378_0000_2",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Archaeological Investigations at 'Affūla",
				"creators": [
					{
						"firstName": "Jean",
						"lastName": "Perrot",
						"creatorType": "author"
					}
				],
				"date": "1949",
				"issue": "3",
				"language": "fre",
				"libraryCatalog": "www.persee.fr",
				"pages": "378-380",
				"publicationTitle": "Syria. Archéologie, Art et histoire",
				"rights": "free",
				"url": "https://www.persee.fr/doc/syria_0039-7946_1949_num_26_3_8413_t1_0378_0000_2",
				"volume": "26",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Archaeological Investigations at 'Affūla#name::#year::1948#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [
					"LF:"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
