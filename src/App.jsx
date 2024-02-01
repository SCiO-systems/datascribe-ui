/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdvancedSearch } from './components';
import './querybuilder.css';
import './App.css';

const App = () => {

	const [mongoQuery, setMongo] = useState();
	const [elasticQuery, setElastic] = useState();

	const filters = [
		{
			"name": "site",
			"label": "site",
			"type": "select",
			"validator": "empty",
			"operators": [
				{
					"name": "=",
					"label": "is"
				},
				{
					"name": "!=",
					"label": "is not"
				}
			],
			"values": [
				{
					"name": "a",
					"label": "a"
				},
				{
					"name": "machangâ",
					"label": "machangâ"
				},
				{
					"name": "adigudem",
					"label": "adigudem"
				},
				{
					"name": "andranomanelatra",
					"label": "andranomanelatra"
				},
				{
					"name": "bertoua",
					"label": "bertoua"
				},
				{
					"name": "bunda",
					"label": "bunda"
				},
				{
					"name": "catchment",
					"label": "catchment"
				},
				{
					"name": "college",
					"label": "college"
				},
				{
					"name": "district",
					"label": "district"
				},
				{
					"name": "farm",
					"label": "farm"
				}
			]
		},
		{
			"name": "enriched_country",
			"label": "Country",
			"type": "select",
			"validator": "select",
			"operators": [
				{
					"name": "=",
					"label": "is"
				},
				{
					"name": "!=",
					"label": "is not"
				}
			],
			"values": [
				{
					"name": "UNM49:566",
					"label": "Nigeria"
				},
				{
					"name": "UNM49:404",
					"label": "Kenya"
				},
				{
					"name": "UNM49:834",
					"label": "Tanzania"
				},
				{
					"name": "UNM49:716",
					"label": "Zimbabwe"
				},
				{
					"name": "UNM49:120",
					"label": "Cameroon"
				},
				{
					"name": "UNM49:231",
					"label": "Ethiopia"
				},
				{
					"name": "UNM49:450",
					"label": "Madagascar"
				},
				{
					"name": "UNM49:454",
					"label": "Malawi"
				},
				{
					"name": "UNM49:894",
					"label": "Zambia"
				}
			]
		},
		{
			"name": "enriched_country.region_level_2_un49",
			"label": "Region",
			"type": "select",
			"validator": "select",
			"operators": [
				{
					"name": "=",
					"label": "is"
				},
				{
					"name": "!=",
					"label": "is not"
				}
			],
			"values": [
				{
					"name": "UNM49:202",
					"label": "Sub-Saharan Africa"
				}
			]
		},
		{
			"name": "enriched_crop",
			"label": "Crop",
			"type": "select",
			"validator": "select",
			"operators": [
				{
					"name": "=",
					"label": "is"
				},
				{
					"name": "!=",
					"label": "is not"
				}
			],
			"values": [
				{
					"name": "maize",
					"label": "maize"
				},
				{
					"name": "wheat",
					"label": "wheat"
				},
				{
					"name": "cotton",
					"label": "cotton"
				},
				{
					"name": "cowpea",
					"label": "cowpea"
				},
				{
					"name": "rice",
					"label": "rice"
				},
				{
					"name": "sorghum",
					"label": "sorghum"
				}
			]
		}
	]

	const fixedFilters = () => {
		let newFilters = filters;
		newFilters = newFilters.map((item) => {
			const temp = { ...item, valueEditorType: item.type };
			// if (item.type !== 'select') {
			// 	delete temp.valueEditorType
			// }
			// delete temp.type
			// delete temp['validator'];
			return temp;
		});
		return newFilters;
	};

	return (
		<AdvancedSearch setElasticQuery={setElastic} setMongoQuery={setMongo} />
	);
};

export default App;
