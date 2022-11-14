{
	"translatorID": "58fd3287-b8e6-4b5d-8367-0ebbd4598991",
	"label": "ubtue_Cairn.info",
	"creator": "Timotheus Kim",
	"target": "https?://www.cairn(-int)?.info",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-20 17:01:49"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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
function romanToInt(r) {
	if (r.match(/^[IVXLCM]+/)) {
	const sym = { 
		'I': 1,
		'V': 5,
		'X': 10,
		'L': 50,
		'C': 100,
		'D': 500,
		'M': 1000
	}
	let result = 0;
	for (i=0; i < r.length; i++){
		const cur = sym[r[i]];
		const next = sym[r[i+1]];
		if (cur < next){
			result += next - cur 
			i++
		} else {
			result += cur
		}
	}

	return result; 
	}
	else return r;
};



function detectWeb(doc, url) {
	if (url.includes('page')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('.titre-article');
	for (let row of rows) {
		let href = row.innerHTML.split('"')[1].split('"')[0];//Z.debug(href)
		let title = ZU.trimInternal(row.textContent);
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
			if (items) ZU.processDocuments(Object.keys(items), scrape);
		});
	}
	else {
		scrape(doc, url);
	}
}

function scrape(doc, url) {
	let risURL = ZU.xpathText(doc, '//a[contains(@href, "exports/export-zotero.php?")]/@href')
	ZU.doGet(risURL, function(text) {
		var translator = Zotero.loadTranslator("import");
		// Use RIS translator
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function(obj, item) {
			var unescapeFields = ['title', 'publicationTitle', 'abstractNote'];
			for (var i=0; i<unescapeFields.length; i++) {
				if (item[unescapeFields[i]]) {
					item[unescapeFields[i]] = ZU.unescapeHTML(item[unescapeFields[i]]);
				}
			}

			// Subtitles could be in i or b
		if (doc.querySelector('.sous-titre-article i')) item.title = item.title + ': ' + doc.querySelector('.sous-titre-article i').textContent.trim();
		if (doc.querySelector('.sous-titre-article b')) item.title = item.title + ': ' + doc.querySelector('.sous-titre-article b').textContent.trim();
		// Correct volume and issue information
		if (item.volume) {
			if (item.volume.search(/^n°/i) != -1) {
				item.volume = item.volume.split(/n°/i)[1].trim();
			} else if (item.volume.search(/^Vol./i) != -1) {
				item.volume = item.volume.split(/Vol./i)[1].trim();
			}
			if (item.volume.search(/^\d+-\d+$/) != -1) {
				var volume = item.volume.split('-');
				item.volume = volume[0];
				item.issue = volume[1];
			}
			if (item.volume.match(/Tome\s+\d+/)) {
				item.volume = item.volume.match(/Tome\s+(\d+)/)[1];
			}
		}
		
		if (!item.date || item.date == '0000-00-00') {
			item.date = ZU.xpathText(doc, '//meta[@name="DCSext.annee_tomaison"]/@content');
		}
		
		if (!item.pages) {
			item.pages = ZU.xpathText(doc, '//meta[@name="DCSext.doc_nb_pages"]/@content');
		}
		
		var doi = ZU.xpathText(doc, '//li[contains(., "DOI :")]');
		if (!item.DOI && doi) {
			item.DOI = doi.replace('DOI :', '');
		}
		
		let abstractFR = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-fr", " " ))]//p');
		let abstractEN = ZU.xpathText(doc, '//*[contains(concat( " ", @class, " " ), concat( " ", "lang-en", " " ))]//p')
		if (item.abstractNote) item.abstractNote = item.abstractNote;
		if (abstractEN && abstractEN.length > 100) item.notes.push('abs:' + abstractEN)
		
		else if (ZU.xpathText(doc, '//meta[@name="citation_abstract" and @lang="en"]/@content') && ZU.xpathText(doc, '//meta[@name="citation_abstract" and @lang="en"]/@content').length > 100) {
			item.notes.push('abs:' + ZU.xpathText(doc, '//meta[@name="citation_abstract" and @lang="en"]/@content'));
		}
		let DOIentry = ZU.xpathText(doc, '//dd');
		if (!item.DOI && DOIentry) {
			let splitDOIentry = DOIentry.split('\n');//Z.debug(splitDOIentry)
			if (splitDOIentry) {
				item.DOI = splitDOIentry[1];
			}
		}
		
		// Cairn.info uses non-standard keywords:
		// we import them here, as the Embedded Metadata translator
		// cannot catch them.
		item.tags = [];
		var keywords = ZU.xpathText(doc, '//meta[@name="article-mot_cle"]/@content | //div[@class="grmotcle lang-en"]//li[@class="motcle"]');
		if (keywords) {
			keywords = keywords.split(/\s*[,;]\s*/);
			for (var i=0; i<keywords.length; i++) {
				if (keywords[i].trim()) {
					item.tags.push(keywords[i].replace(/^[a-zA-ZÀ-ÿ-. ]/, function($0) { return $0.toUpperCase(); }));
					}
				}
			}
		if (item.volume) item.volume = romanToInt(item.volume).toString();
		if (item.publicationTitle == "L'Année canonique") {
			item.ISSN = "0570-1953";
			item.issue = "";
		} 
		else if (item.publicationTitle == "Études théologiques et religieuses") item.ISSN = "0014-2239";
		if (["gratuit", "post barrière mobile"].includes(ZU.xpathText(doc, '//meta[@name="DCSext.comm_art"]/@content'))) item.notes.push('LF:');
		item.attachments = [];
		item.complete();
		});
		translator.translate();
	});
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Que fait le genre à l’éthique théologique ?Éléments d’histoire et problématiques: Éléments d’histoire et problématiques: Éléments d’histoire et problématiques",
				"creators": [
					{
						"lastName": "Saintôt",
						"firstName": "Bruno",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/retm.311.0013",
				"ISSN": "9782204138093",
				"abstractNote": "Depuis la Quatrième conférence mondiale sur les femmes de Pékin, en 1995, le magistère catholique n’a cessé de s’opposer à l’usage du terme genre, accusé de propager une idéologie cherchant à déconstruire la sexualité, la procréation, la famille. Une valorisation récente du genre comme « rôle socioculturel du sexe » continue à souligner les dangers d’une dissociation entre sexe et genre. En adoptant une perspective historique, l’article analyse les significations et usages de la notion de genre. Il propose également une évaluation des changements théologiques opérés (justification des rôles et des pouvoirs, sexualité), des changements possibles (homosexualité), des impensés (transidentité et transsexualité), et des points fermes de résistance éthique (rapport au corps, procréation, écologie).",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "13-27",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "Que fait le genre à l’éthique théologique ?",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
				"volume": "308",
				"attachments": [],
				"tags": [
					{
						"tag": "Catholicisme"
					},
					{
						"tag": "Genre"
					},
					{
						"tag": "Sexualité"
					},
					{
						"tag": "Théorie du genre"
					},
					{
						"tag": "Éthique sexuelle"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"lastName": "Sonnet",
						"firstName": "Jean-Pierre",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/nrt.424.0529",
				"abstractNote": "La crise du Covid-19 a été annoncée par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu’il s’agit d’entendre à nouveau. En Gn 1,28, le Dieu créateur institue Adam gardien des espèces animales et fait de lui le garant de leur distinction. Loin d’être une anthologie d’obscurantismes, la Bible est le précipité d’une sagesse immémoriale et prophétique ; elle sait que le rapport de l’homme aux espèces animales est un lieu redoutable, où se joue quelque chose du divin.",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Nouvelle revue théologique",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue théologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm",
				"volume": "142",
				"attachments": [],
				"tags": [
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Espèces animales"
					},
					{
						"tag": "Genèse 1"
					},
					{
						"tag": "Lévitique 11"
					},
					{
						"tag": "Respect des distinctions"
					},
					{
						"tag": "Zoonose"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Que fait le genre à l’éthique théologique ?Éléments d’histoire et problématiques: Éléments d’histoire et problématiques: Éléments d’histoire et problématiques",
				"creators": [
					{
						"lastName": "Saintôt",
						"firstName": "Bruno",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/retm.311.0013",
				"ISSN": "9782204138093",
				"abstractNote": "Depuis la Quatrième conférence mondiale sur les femmes de Pékin, en 1995, le magistère catholique n’a cessé de s’opposer à l’usage du terme genre, accusé de propager une idéologie cherchant à déconstruire la sexualité, la procréation, la famille. Une valorisation récente du genre comme « rôle socioculturel du sexe » continue à souligner les dangers d’une dissociation entre sexe et genre. En adoptant une perspective historique, l’article analyse les significations et usages de la notion de genre. Il propose également une évaluation des changements théologiques opérés (justification des rôles et des pouvoirs, sexualité), des changements possibles (homosexualité), des impensés (transidentité et transsexualité), et des points fermes de résistance éthique (rapport au corps, procréation, écologie).",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "13-27",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "Que fait le genre à l’éthique théologique ?",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-4-page-13.htm",
				"volume": "308",
				"attachments": [],
				"tags": [
					{
						"tag": "Catholicisme"
					},
					{
						"tag": "Genre"
					},
					{
						"tag": "Sexualité"
					},
					{
						"tag": "Théorie du genre"
					},
					{
						"tag": "Éthique sexuelle"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2019-4-page-43.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La philosophie morale d’Alasdair MacIntyre. Une défense historiciste de l’impératif catégorique ?: Une défense historiciste de l’impératif catégorique ?",
				"creators": [
					{
						"lastName": "Boss",
						"firstName": "Marc",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.3917/retm.306.0043",
				"ISSN": "9782204132473",
				"abstractNote": "La philosophie morale d’Alasdair MacIntyre repose sur une épistémologie ouvertement historiciste. L’historicisme est classiquement soupçonné de se dissoudre en relativisme dès lors qu’il rejette toute prétention à un savoir absolu qui dirait le fin mot de l’histoire, mais la thèse de MacIntyre maintient, en dépit d’un faillibilisme revendiqué, que les discours évaluatifs peuvent être soumis à des normes de décidabilité rationnellement justifiables. À la lumière des thèses corollaires de la rationalité des traditions et de l’indétermination constitutive des conceptions du bien, le présent article suggère que l’historicisme de MacIntyre renouvelle, dans un cadre théorique alternatif à celui de Kant, les principales caractéristiques d’une impérativité morale catégorique.",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "43-58",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "La philosophie morale d’Alasdair MacIntyre",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2019-4-page-43.htm",
				"volume": "304",
				"attachments": [],
				"tags": [
					{
						"tag": "Historicisme"
					},
					{
						"tag": "Kant"
					},
					{
						"tag": "MacIntyre"
					},
					{
						"tag": "Relativisme"
					},
					{
						"tag": "Vertus"
					},
					{
						"tag": "Émotivisme"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-reforme-humanisme-renaissance-2020-2-page-13.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Les Lettres nouvelles de Milan de Pierre Gringore : la propagande entre vers et prose",
				"creators": [
					{
						"lastName": "Delvallée",
						"firstName": "Ellen",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/rhren.091.0013",
				"abstractNote": "Pierre Gringore compose les Lettres Nouvelles de Milan à l’occasion de la capture de Ludovic Sforza en 1500. Le texte se présente comme un bulletin d’information, recueillant trois lettres en prose détaillant les événements, puis des vers reprenant peu ou prou les mêmes informations. Quelles valeurs revêtent prose et vers dans ce texte de propagande ? Tandis que les lettres en prose offrent des témoignages de première main et garantissent une vérité factuelle, les vers fonctionnent comme une amplification encomiastique à la gloire de la couronne de France mais aussi du poète qui cherche un mécène. Par ailleurs, Gringore propose également dans ses vers au style plus ou moins orné une réflexion sur le rôle du poète pour établir une vérité morale et la transmettre à des publics variés.\\n4207 Pierre Gringore writes the Lettres Nouvelles de Milan when Ludovico Sforza got caught in 1500. His text consists of a news report, gathering three prose letters explaining the events along with lines of verse giving more or less the same information. What are the values assumed by prose and verse in this work of propaganda? While prose letters provide with first-hand testimonies and guarantee factual truth, the lines of verse work as an encomiastic amplification, to the glory of the French crown but also of the poet himself, looking for a patron. Moreover, through his more or less ornated lines of verse, Gringore also offers a reflection upon the poet’s role to establish a moral truth and to transmit it to a diversified audience.",
				"archive": "Cairn.info",
				"issue": "2",
				"journalAbbreviation": "Réforme, Humanisme, Renaissance",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "13-30",
				"publicationTitle": "Réforme, Humanisme, Renaissance",
				"shortTitle": "Les Lettres nouvelles de Milan de Pierre Gringore",
				"url": "https://www.cairn.info/revue-reforme-humanisme-renaissance-2020-2-page-13.htm",
				"volume": "91",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-2-page-11.htm",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Éthiques animales : la double dissociation",
				"creators": [
					{
						"lastName": "Charmetant",
						"firstName": "Eric",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/retm.308.0011",
				"ISSN": "9782204138062",
				"abstractNote": "La constitution des éthiques animales depuis le xixe siècle est marquée par une double dissociation : premièrement, entre la militance contre la souffrance animale et la protection de la nature sauvage ; deuxièmement, entre les diverses éthiques animales académiques et les éthiques environnementales. Cette étude montrera comment cette dissociation s’est constituée historiquement, quelles en sont les conséquences et comment la surmonter. Seul un dépassement de la césure radicale entre le sauvage et le domestique permet de fonder une éthique qui soit animale et environnementale.",
				"archive": "Cairn.info",
				"issue": "2",
				"journalAbbreviation": "Revue d'éthique et de théologie morale",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "11-22",
				"publicationTitle": "Revue d'éthique et de théologie morale",
				"shortTitle": "Éthiques animales",
				"url": "https://www.cairn.info/revue-d-ethique-et-de-theologie-morale-2020-2-page-11.htm",
				"volume": "306",
				"attachments": [],
				"tags": [
					{
						"tag": "Domestication"
					},
					{
						"tag": "Sauvage"
					},
					{
						"tag": "Écologie"
					},
					{
						"tag": "Éthique animale"
					},
					{
						"tag": "Éthique environnementale"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm?contenu=resume",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19 : un texte prémonitoire",
				"creators": [
					{
						"lastName": "Sonnet",
						"firstName": "Jean-Pierre",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.3917/nrt.424.0529",
				"abstractNote": "La crise du Covid-19 a été annoncée par des scientifiques clairvoyants. Bien avant eux, la Bible a fait entendre un avertissement qu’il s’agit d’entendre à nouveau. En Gn 1,28, le Dieu créateur institue Adam gardien des espèces animales et fait de lui le garant de leur distinction. Loin d’être une anthologie d’obscurantismes, la Bible est le précipité d’une sagesse immémoriale et prophétique ; elle sait que le rapport de l’homme aux espèces animales est un lieu redoutable, où se joue quelque chose du divin.",
				"archive": "Cairn.info",
				"issue": "4",
				"journalAbbreviation": "Nouvelle revue théologique",
				"language": "FR",
				"libraryCatalog": "ubtue_Cairn.info",
				"pages": "529-541",
				"publicationTitle": "Nouvelle revue théologique",
				"shortTitle": "Le gardien des espèces. Gn 1,28 dans le contexte du Covid-19",
				"url": "https://www.cairn.info/revue-nouvelle-revue-theologique-2020-4-page-529.htm",
				"volume": "142",
				"attachments": [],
				"tags": [
					{
						"tag": "Covid-19"
					},
					{
						"tag": "Espèces animales"
					},
					{
						"tag": "Genèse 1"
					},
					{
						"tag": "Lévitique 11"
					},
					{
						"tag": "Respect des distinctions"
					},
					{
						"tag": "Zoonose"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
