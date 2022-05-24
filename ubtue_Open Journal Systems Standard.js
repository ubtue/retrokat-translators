{
	"translatorID": "a5d5ca83-b975-4abe-86c9-d956d7b9c8fa",
	"label": "ubtue_Open Journal Systems Standard",
	"creator": "Timotheus Kim",
	"target": "article|issue/view/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-05-24 09:11:08"
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
	else if (url.match(/article/)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "media-heading", " " ))]//a | //*[contains(concat( " ", @class, " " ), concat( " ", "title", " " ))]//a | //a[contains(@href, "/article/view/") and not(contains(@href, "/pdf")) and not(contains(., "PDF"))  and not(contains(., "HTML"))]');
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


function getOrcids(doc, ISSN) {
	let authorSections = ZU.xpath(doc, '//ul[@class="authors-string"]/li');
	let notes = [];
	
	// e.g. https://www.koersjournal.org.za/index.php/koers/article/view/2472
	for (let authorSection of authorSections) {
		let authorLink = authorSection.querySelector('a.author-string-href span');
		let orcidLink = authorSection.querySelector('[href*="https://orcid.org"]');
		if (authorLink && orcidLink) {
			let author = authorLink.innerText;
			let orcid = orcidLink.textContent.match(/\d+-\d+-\d+-\d+x?/i);
			if (!orcid)
				continue;
			notes.push({note: "orcid:" + orcid + ' | ' + author});
		}
	}
	if (notes.length) return notes;
	
	
	// e.g. https://www.sanisidoro.net/publicaciones/index.php/isidorianum/article/view/147
	authorSections = ZU.xpath(doc, '//ul[contains(@class, "authors")]/li');
	for (let authorSection of authorSections) {
		let authorSpans = authorSection.querySelector('span[class="name"]');
		let orcidSpans = authorSection.querySelector('span[class="orcid"]');
		if (authorSpans && orcidSpans) {
		   let author = authorSpans.innerText.trim();
		   let orcidAnchor =  orcidSpans.querySelector('a');
		   if (!orcidAnchor)
			   continue;
		   let orcidUrl = orcidAnchor.href;
		   if (!orcidUrl)
			   continue;
		   let orcid = orcidUrl.match(/\d+-\d+-\d+-\d+x?/i);
		   if (!orcid)
			   continue;
		   notes.push( {note: "orcid:" + orcid + ' | ' + author});
		}
	}
	if (notes.length) return notes;
  	
  	 // e.g. https://jeac.de/ojs/index.php/jeac/article/view/844
  	 // e.g. https://jebs.eu/ojs/index.php/jebs/article/view/336
  	 // e.g. https://bildungsforschung.org/ojs/index.php/beabs/article/view/783
  	 if (['2627-6062', "1804-6444", "2748-6419"].includes(ISSN)) {
  	 	let orcidAuthorEntryCaseA = doc.querySelectorAll('.authors');
  	 	if (orcidAuthorEntryCaseA) {
  		for (let a of orcidAuthorEntryCaseA) {
  			let name_to_orcid = {};
  			let tgs = ZU.xpath(a, './/*[self::strong or self::a]');
  			let tg_nr = 0;
  			for (let t of tgs) {
  				if (t.textContent.match(/orcid/) != null) {
  					name_to_orcid[tgs[tg_nr -1].textContent] = t.textContent.trim();
  					let author = ZU.unescapeHTML(ZU.trimInternal(tgs[tg_nr -1].textContent)).trim();
  					let orcid = ZU.unescapeHTML(ZU.trimInternal(t.textContent)).trim();
  					notes.push({note: orcid.replace(/https?:\/\/orcid.org\//g, 'orcid:') + ' | ' + author});
  				}
  				tg_nr += 1;
  			}
  		}
  	 }
  	 }
  		 
	if (notes.length) return notes;
	
	//e.g. https://ote-journal.otwsa-otssa.org.za/index.php/journal/article/view/433
  	let orcidAuthorEntryCaseB = doc.querySelectorAll('.authors-string');//Z.debug(orcidAuthorEntryCaseC)
  	if (orcidAuthorEntryCaseB) {
  	 	for (let c of orcidAuthorEntryCaseB) {
  			if (c && c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
  				let orcid = ZU.xpathText(c, './/a[@class="orcidImage"]/@href', '');
  				let author = ZU.xpathText(c, './/span', '');
  				if (orcid != null && author != null) {
  					author = ZU.unescapeHTML(ZU.trimInternal(author)).trim();
  					orcid = ZU.unescapeHTML(ZU.trimInternal(orcid)).trim();
  					notes.push({note: orcid.replace(/https?:\/\/orcid.org\//g, 'orcid:') + ' | ' + author});
  				}
  			}
  		}
  	}
  	
  	if (notes.length) return notes;
  	
	//e.g. https://missionalia.journals.ac.za/pub/article/view/422
	let orcidAuthorEntryCaseC = doc.querySelectorAll('.authorBio');//Z.debug(orcidAuthorEntryCaseC)
  	if (orcidAuthorEntryCaseC) {
  	 	for (let c of orcidAuthorEntryCaseC) {
  			if (c && c.innerHTML.match(/\d+-\d+-\d+-\d+x?/gi)) {
  				let orcid = ZU.xpathText(c, './/a[@class="orcid"]/@href', '');
  				let author = ZU.xpathText(c, './/em', '');
  				if (orcid != null && author != null) {
  					author = ZU.unescapeHTML(ZU.trimInternal(author)).trim();
  					orcid = ZU.unescapeHTML(ZU.trimInternal(orcid)).trim();
  					notes.push({note: orcid.replace(/https?:\/\/orcid.org\//g, 'orcid:') + ' | ' + author});
  				}
  			}
  		}
  	}
	
	// kein Beispiel gefunden
  	/*if (orcidAuthorEntryCaseC) {
  		for (let c of orcidAuthorEntryCaseC) {
  			if (c && c.innerText.match(/\d+-\d+-\d+-\d+x?/gi)) {
  				let author = c.innerText;//Z.debug(author  + '   CCC')
  				notes.push({note: ZU.unescapeHTML(ZU.trimInternal(author)).replace(/https?:\/\/orcid\.org\//g, ' | orcid:')});
  			}
  		}
  	}*/
  	
  	// kein Beispiel gefunden
	let orcidAuthorEntryCaseD = ZU.xpath(doc, '//div[@id="authors"]');
	if (orcidAuthorEntryCaseD.length != 0) {
		for (let o of ZU.xpath(orcidAuthorEntryCaseD[0], './/div[@class="card-body"]')) {
			if (ZU.xpathText(o, './/a[contains(@href, "orcid")]') != null) {
				let orcid = ZU.trimInternal(ZU.xpathText(o, './/a[contains(@href, "orcid")]'));
				let author = ZU.trimInternal(o.innerHTML.split('&nbsp;')[0]);
				notes.push({note: orcid.replace(/https?:\/\/orcid\.org\//g, 'orcid:') + ' | ' + author.replace(/<\/?.+?>/g, '')});
			}
		}
	}
	return notes;
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
		if (i.ISSN == '2413-3108') {
			// Fix erroneous firstpage in embedded metadata with issue prefix
			i.pages  = i.pages.replace(/(?:\d+\/)?(\d+-\d+)/, "$1");
		}
		if (i.issue === "0") delete i.issue;
		if (i.abstractNote && i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
		let orcids = getOrcids(doc);
		if (orcids)
			i.notes.push(...orcids);
		i.tags = splitDotSeparatedKeywords(i);
		i.title = joinTitleAndSubtitle(doc, i);
		// some journal assigns the volume to the date
		if (i.ISSN == '1983-2850') {
			if (i.date == i.volume) {
				let datePath = doc.querySelector('.item.published');
			}
			if (datePath) {
				let itemDate = datePath.innerHTML.match(/.*(\d{4}).*/);
				if (itemDate.length >= 2) {
					i.date = itemDate[1];
				}
			} else i.date = '';
		}
		i.title = i.title.replace(/(<\/?[^>]+>)|(&nbsp;)/g, '');
		for (let abstract of ZU.xpath(doc, '//meta[@name="DC.Description"]/@content')) {
			abstract = abstract.textContent.replace(/(<\/?[^>]+>)|(&nbsp;)/g, '');
			if (i.abstractNote != abstract && abstract.trim() != "" && abstract != ".") {
				i.notes.push({note: "abs:" + abstract});
			}
		}
		if (i.abstractNote != undefined) {
			if (i.abstractNote.match(/ISBN:?\s+((?:\d+[\- ]*)+)/) != null) {
				i.tags.push("#reviewed_pub#isbn::" + i.abstractNote.match(/ISBN:?\s+((?:\d+[\- ]*)+)/)[1].trim() + "#")
			}
		}
		if (i.title != undefined) {
			if (i.title.match(/ISBN:?\s+((?:\d+[\- ]*)+)/) != null) {
				i.tags.push("#reviewed_pub#isbn::" + i.title.match(/ISBN:?\s+((?:\d+[\- ]*)+)/)[1].trim() + "#")
			}
		}
		if (ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content') != null) {
			if (ZU.xpathText(doc, '//meta[@name="DC.Type.articleType"]/@content').match(/^(Comptes rendus)|(Vient de paraître)|(Reseñas)|(Recenzje)|((Buch)?besprechungen)|(Recensões)/i) != null) {
				i.tags.push("Book Review");
				if (i.url.match(/revues\.droz/) != null) {
					review_tags = ZU.xpath(doc, '//h1[@class="page-header"]');
					if (review_tags.length > 0) {
						let review_section = review_tags[0].innerHTML;
						let reviewed_publishing = ZU.xpathText(review_tags[0], './p[@class="small"]');
						let review_keyword = "";
						let reviewed_title = review_section.match(/<i>(.+)<\/i>/);
						if (reviewed_title != null) {
							Z.debug(review_section);
							review_keyword += "#reviewed_pub#title::" + reviewed_title[1];
							let reviewed_author = review_section.match(/(.+?)<i>/);
							if (reviewed_author != null) {
								reviewed_author = reviewed_author[1].trim().replace(/,/, "").split(" et ")[0];
								splitted_author = ZU.cleanAuthor(reviewed_author, 'author');
								reviewed_author_inverted = splitted_author.lastName + ", " + splitted_author.firstName;
								review_keyword += "#name::" + reviewed_author_inverted;
							}
							
							let reviewed_year = reviewed_publishing.match(/\d{4}/);
							if (reviewed_year != null) review_keyword += "#year::" + reviewed_year[0];
							let reviewed_publisher = reviewed_publishing.match(/\s+:\s+(.+?),/);
							if (reviewed_publisher != null) review_keyword += "#publisher::" + reviewed_publisher[1];
							let reviewed_place = reviewed_publishing.match(/(.+?)\s+:\s+/);
							if (reviewed_place != null) review_keyword += "#place::" + reviewed_place[1];
							review_keyword += "#";
							review_keyword = ZU.trimInternal(review_keyword.replace(/(?:&nbsp;)/g, " ").replace(/(?:<\/?.+?>)/g, ""));
							i.tags.push(review_keyword);
						}
						
					}
				}
			}
		}
		if (ZU.xpath(doc, '//meta[@name="citation_keywords"]/@content').length > 1) {
		for (let keyword of ZU.xpath(doc, '//meta[@name="citation_keywords"]/@content')) {
			keyWord = keyword.textContent;
			i.tags.push(keyWord);
		}
		}
		i.attachments = [];
		if (i.abstractNote != undefined) {
		if (i.abstractNote.match(/Archivo Teológico Granadino es una revista científica/) != null) {
			i.abstractNote = "";
		}
		}
		if (ZU.xpathText(doc, '//meta[@name="DC.Rights" and contains(@content, "creativecommons")]/@content') != null) i.notes.push("LF:")
		if (i.language == "español") {
			i.language = "spa";
		}
		if (i.ISSN = "0121-4977" && ["es", "spa"].includes(i.language)) {
		if (ZU.xpathText(doc, '//meta[@name="citation_author"]/@content').match(/((comunidad|comisión)\s+de)|((Secretariado|Congregación)\s+para)/i)) {
				i.creators = [];
				i.creators.push({lastName: ZU.xpathText(doc, '//meta[@name="citation_author"]/@content'), firstName: "", creatorType: "author", fieldMode: 1 });
		}
		else {
			for (let c of i.creators) {
			if (c.firstName.match(/de\s+[^\s+]+\s+y\b/i) != null) {
				let totalName = c.firstName + " " + c.lastName;
				c.lastName = totalName.substring(totalName.match(/de\s+[^\s]+\s+y\b/i).index, totalName.length);
				c.firstName = totalName.substring(0, totalName.match(/de\s+[^\s]+\s+y\b/i).index);
			}
		}
		}
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
		"url": "https://ojs.reformedjournals.co.za/stj/issue/view/70",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“The message to the people of South Africa” in contemporary context: The question of Palestine and the challenge to the church",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Braverman",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.17570/stj.2019.v5n3.a01",
				"ISSN": "2413-9467",
				"abstractNote": "In September 2018 John de Gruchy presented a paper at the Volmoed Colloquium entitled “Revisiting the Message to the people of South Africa,” in which he asks, “what is the significance of the document for our time?” In this expanded version of the author’s response to de Gruchy, two further questions are pursued: First: how can the churches today meet the challenge of today’s global system of economically and politically-driven inequality driven by a constellation of individuals, corporations, and governments? Second: in his review of church history, de Gruchy focused on the issue of church theology described in the 1985 Kairos South Africa document, in which churches use words that purport to support justice but actually serve to shore up the status quo of discrimination, inequality and racism. How does church theology manifest in the contemporary global context, and what is the remedy? The author proposes that ecumenism can serve as a mobilizing and organizing model for church action, and that active engagement in the issue of Palestine is an entry point for church renewal and for a necessary and fruitful exploration of critical issues in theology and ecclesiology.",
				"issue": "3",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "13-40",
				"publicationTitle": "STJ | Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2020 Pieter de Waal Neethling Trust, Stellenbosch",
				"shortTitle": "“The message to the people of South Africa” in contemporary context",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
				"volume": "5",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
		"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Geleitwort",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Oesterheld",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISSN": "0254-4407",
				"language": "en",
				"libraryCatalog": "www.zwingliana.ch",
				"pages": "VII-IX",
				"publicationTitle": "Zwingliana",
				"rights": "Authors who are published in this journal agree to the following conditions:  a) The authors retain the copyright and allow the journal to print the first publication in print as well as to make it electronically available at the end of three years.  b) The author may allot distribution of their first version of the article with additional contracts for non-exclusive publications by naming the first publication in this Journal in said publication (i.e. publishing the article in a book or other publications).",
				"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
				"volume": "45",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
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
