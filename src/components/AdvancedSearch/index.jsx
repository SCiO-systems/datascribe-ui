/* eslint-disable */
import React, { useEffect, useState } from 'react';
import QueryBuilder, { defaultValidator, defaultValueProcessor, formatQuery } from 'react-querybuilder';

const AdvancedSearch = (props) => {

	const params = props.params || {};
	const {addIcon, deleteIcon, setValid, filters} = props;

	const [mongoQuery, setMongo] = useState();
	const [elasticQuery, setElastic] = useState();
	const setMongoQuery = props.setMongoQuery || setMongo;
	const setElasticQuery = props.setElasticQuery || setElastic;

	const [queryPath, setQueryPath] = useState(null);
	const [enableSearch, setEnableSearch] = useState(false);
	const [fields, setFields] = useState([]);

	const [query, setQuery] = useState(
		{
		rules: [
			// {
			// 	field: 'dataset_id',
			// 	value: '',
			// 	operator: '=',
			// },
		],
		combinator: 'and',
		not: false,
	}
	);

	const elementMap = filters?.map(item => {
		return {field: item.name, element: item.name}
	}) || []

	const dataPoolCode = 'public' || '4615-2134-8076'

	// const [elementMap, setElementMap] = useState([
	// 	{ field: 'dataset_id', element: 'dataset_id' },
	// 	{ field: 'regions', element: 'geography.regions.UNM49' },
	// 	{ field: 'country', element: 'geography.country.UNM49' },
	// 	{ field: 'crop', element: 'crop' },
	// 	{ field: 'planting_year', element: 'planting_date.start_year' },
	// 	{ field: 'harvesting_year', element: 'harvesting_date.end_year' },
	// 	{ field: 'yield', element: 'yield' },
	// 	{ field: 'total_biomass', element: 'biomass_total' },
	// 	{ field: 'inorganic_fertilizer', element: 'fertilizer_type' },
	// 	{ field: 'organic_fertilizer', element: 'OM_type' },
	// 	{ field: 'N_fertilizer', element: 'N_fertilizer' },
	// 	{ field: 'P_fertilizer', element: 'P_fertilizer' },
	// 	{ field: 'K_fertilizer', element: 'K_fertilizer' },
	// 	{ field: 'Zn_fertilizer', element: 'Zn_fertilizer' },
	// 	{ field: 'S_fertilizer', element: 'S_fertilizer' },
	// 	{ field: 'OM_N', element: 'OM_N' },
	// 	{ field: 'OM_P', element: 'OM_P' },
	// 	{ field: 'OM_K', element: 'OM_K' },
	// 	{ field: 'soil_pH', element: 'soil_pH' },
	// 	{ field: 'soil_SOC', element: 'soil_SOC' },
	// 	{ field: 'soil_sand', element: 'soil_sand' },
	// 	{ field: 'soil_clay', element: 'soil_clay' },
	// 	{ field: 'soil_silt', element: 'soil_silt' },
	// 	{ field: 'tillage', element: 'tillage' },
	// 	{ field: 'irrigated', element: 'irrigated' },
	// 	{ field: 'rain', element: 'rain' },
	// ]);

	const valueProcessor = (field, operator, value) => {
		if (!value) {
			value = 'wrong_qbuilder_value';
		} else if ((field === 'planting_year') || (field === 'harvesting_year')) {
			const current_year = new Date().getFullYear();
			if ((value < 1968) || (value > current_year)) {
				value = 'wrong_qbuilder_value';
			}
		} else {
			const trimStr = value.replace(/\s+/g, '');
			if (trimStr === '') {
				value = 'wrong_qbuilder_value';
			}
		}
		//----------------------
		return defaultValueProcessor(field, operator, value);
	};

	const logQuery = (query) => {
		const tempQP = `/search-results/` +
            `{"json_query":${formatQuery(query, 'json_without_ids').replace(/\r/g, '')}}`;

		//-------------------------------
		setQueryPath(tempQP);
		//-------------------------------

		const XsearchQuery = formatQuery(query, { format: 'sql', valueProcessor });
		//---------------------------
		const trimStr = XsearchQuery.replace(/\s+/g, '');
		//---------------------------
		if (setValid) {
			if ((trimStr.includes('wrong_qbuilder_value')) || (trimStr.includes('(1=1)')) || (trimStr.includes('%%'))) {
				setValid(false);
			} else {
				setValid(true);
			}
		}
	};

	const constructJsonQuery = () => {
		let tempQP = "{\"json_query"
		let zt   = "json_query";
		//-------------------------------
		let final_json_query = queryPath.substring(queryPath.indexOf(zt)+zt.length, queryPath.length);

		while (final_json_query.includes("\\\"")) {
			final_json_query = final_json_query.replace(/\\\"/g, "");
		}

		while (final_json_query.includes("\\\\")) {
			final_json_query = final_json_query.replace(/\\\\/g, "");
		}

		return tempQP + final_json_query;
	}

	const constructElasticQuery = (query) => {
		const FULLquery = JSON.parse(query);
		//--------------------------

		let ElasticQuery = '{ \\"query\\": ';

		const parseQuery = (Qlevel, obj) => {
			if (obj.rules) {
				// ------------------------- FIX GROUP > FIRST
				if (Qlevel > 0) { ElasticQuery += ','; }
				// ------------------------- GROUP PRE STATEMENTS
				ElasticQuery += '{ \\"bool\\": {';
				if (obj.combinator === 'and') {
					ElasticQuery += '\\"must\\": [ ';
				} else {
					ElasticQuery += '\\"should\\": [ ';
				}
				// ---------------------------------- GROUP MAIN BODY

				for (let i = 0; i < obj.rules.length; i++) {
					if (obj.rules[i].rules) {
						parseQuery(i, obj.rules[i]);
					} else {
						// ---------------------------------- FIX RULE > FIRST
						if (i > 0) { ElasticQuery += ','; }
						// ---------------------------------- GET MODEL ELEMENT
						let element = '';
						for (let j = 0; j < elementMap.length; j++) {
							if (elementMap[j].field === obj.rules[i].field) {
								element = elementMap[j].element;
							}
						}
						// ---------------------------------- RULE MAIN BODY
						if (element) {
							// ----------- contains (contains)
							if (obj.rules[i].operator === 'contains') {
								if (element === 'multi_match') {
									ElasticQuery += `{ \\"multi_match\\": { \\"query\\":\\"${obj.rules[i].value}\\", \\"fields\\": [ \\"title.value\\", \\"description.value\\", \\"keywords.value.keyword\\" ], \\"type\\":\\"phrase\\" } }`;
								} else {
									ElasticQuery += `{ \\"match_phrase\\": { \\"${element}\\": \\"${obj.rules[i].value}\\" } }`;
								}
							}
							// ----------- does not contain (doesNotContain)
							if (obj.rules[i].operator === 'doesNotContain') {
								if (element === 'multi_match') {
									ElasticQuery += `{ \\"bool\\": { \\"must_not\\": [ { \\"multi_match\\": { \\"query\\":\\"${obj.rules[i].value}\\", \\"fields\\": [ \\"title.value\\", \\"description.value\\", \\"keywords.value.keyword\\" ], \\"type\\":\\"phrase\\" } } ] } }`;
								} else {
									ElasticQuery += `{ \\"bool\\": { \\"must_not\\": [ { \\"match_phrase\\": { \\"${element}\\": \\"${obj.rules[i].value}\\" } } ] } }`;
								}
							}

							// ----------- is (=)
							if (obj.rules[i].operator === '=') {
								ElasticQuery += `{ \\"term\\": { \\"${element}.keyword\\": { \\"value\\": \\"${obj.rules[i].value}\\" } } }`;
							}

							// ----------- is not (!=)
							if (obj.rules[i].operator === '!=') {
								ElasticQuery += `{ \\"bool\\": { \\"must_not\\": [ { \\"term\\": { \\"${element}.keyword\\": { \\"value\\": \\"${obj.rules[i].value}\\" } } } ] } }`;
							}

							// ----------- is greater than or equal to (>=)
							if (obj.rules[i].operator === '>=') {
								ElasticQuery += `{ \\"range\\": { \\"${element}\\": { \\"gte\\": \\"${obj.rules[i].value}\\" } } }`;
							}

							// ----------- is less than or equal to (<=)
							if (obj.rules[i].operator === '<=') {
								ElasticQuery += `{ \\"range\\": { \\"${element}\\": { \\"lte\\": \\"${obj.rules[i].value}\\" } } }`;
							}
						}
					}
				}
				// ------------------------- GROUP POST STATEMENTS
				ElasticQuery += '] } } ';
			}
			return ElasticQuery;
		};

		//--------------------------

		const ElasticSearchQuery = `${parseQuery(0, FULLquery.json_query)}}`;

		//--------------------------
		let cleanQUERY = ElasticSearchQuery.replace('{ \\"query\\":', '');
		cleanQUERY = cleanQUERY.slice(0, cleanQUERY.lastIndexOf('}'));

		return ["{ \"query\": \"" + cleanQUERY + "\"}", cleanQUERY];
	}

	useEffect(() => {
		if (queryPath) {
			const jsonQuery = constructJsonQuery()
			const elasticQueries = constructElasticQuery(jsonQuery);
			setMongoQuery(jsonQuery);
			setElasticQuery(elasticQueries[0]);
		}
	}, [queryPath]);

	useEffect(() => {
		if (params.query) {
			const paramQuery = JSON.parse(params.query)
			setQuery(paramQuery.json_query);

			logQuery(query);
		}
	}, []);

	useEffect(() => {
		if (filters) {
			setFields([...filters])
		}
		// if (dataPoolCode === 'public') {
		// 	setFields(
		// 		[
		// 		{ name: 'dataset_id', label: 'Dataset ID', operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'regions',
		// 			label: 'Region',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'UNM49:001', label: 'World' },
		// 				{ name: 'UNM49:002', label: 'Africa' },
		// 				{ name: 'UNM49:015', label: 'Africa / Northern Africa' },
		// 				{ name: 'UNM49:202', label: 'Africa / Sub-Saharan Africa' },
		// 				{ name: 'UNM49:014', label: 'Africa / Sub-Saharan Africa / Eastern Africa' },
		// 				{ name: 'UNM49:017', label: 'Africa / Sub-Saharan Africa / Middle Africa' },
		// 				{ name: 'UNM49:018', label: 'Africa / Sub-Saharan Africa / Southern Africa' },
		// 				{ name: 'UNM49:011', label: 'Africa / Sub-Saharan Africa / Western Africa' },
		// 				{ name: 'UNM49:019', label: 'Americas' },
		// 				{ name: 'UNM49:419', label: 'Americas / Latin America and the Caribbean' },
		// 				{ name: 'UNM49:013', label: 'Americas / Latin America and the Caribbean / Central America' },
		// 				{ name: 'UNM49:005', label: 'Americas / Latin America and the Caribbean / South America' },
		// 				{ name: 'UNM49:021', label: 'Americas / Northern America' },
		// 				{ name: 'UNM49:142', label: 'Asia' },
		// 				{ name: 'UNM49:030', label: 'Asia / Eastern Asia' },
		// 				{ name: 'UNM49:035', label: 'Asia / South-eastern Asia' },
		// 				{ name: 'UNM49:034', label: 'Asia / Southern Asia' },
		// 				{ name: 'UNM49:145', label: 'Asia / Western Asia' },
		// 				{ name: 'UNM49:150', label: 'Europe' },
		// 				{ name: 'UNM49:151', label: 'Europe / Eastern Europe' },
		// 				{ name: 'UNM49:039', label: 'Europe / Southern Europe' },
		// 				{ name: 'UNM49:009', label: 'Oceania' },
		// 				{ name: 'UNM49:053', label: 'Oceania / Australia and New Zealand' },
		//
		// 			],
		// 		},
		//
		// 		{ name: 'country',
		// 			label: 'Country',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'UNM49:032', label: 'Argentina' },
		// 				{ name: 'UNM49:036', label: 'Australia' },
		// 				{ name: 'UNM49:050', label: 'Bangladesh' },
		// 				{ name: 'UNM49:204', label: 'Benin' },
		// 				{ name: 'UNM49:072', label: 'Botswana' },
		// 				{ name: 'UNM49:076', label: 'Brazil' },
		// 				{ name: 'UNM49:100', label: 'Bulgaria' },
		// 				{ name: 'UNM49:854', label: 'Burkina Faso' },
		// 				{ name: 'UNM49:108', label: 'Burundi' },
		// 				{ name: 'UNM49:120', label: 'Cameroon' },
		// 				{ name: 'UNM49:124', label: 'Canada' },
		// 				{ name: 'UNM49:152', label: 'Chile' },
		// 				{ name: 'UNM49:156', label: 'China' },
		// 				{ name: 'UNM49:384', label: 'Côte d’Ivoire' },
		// 				{ name: 'UNM49:180', label: 'Democratic Republic of the Congo' },
		// 				{ name: 'UNM49:818', label: 'Egypt' },
		// 				{ name: 'UNM49:231', label: 'Ethiopia' },
		// 				{ name: 'UNM49:270', label: 'Gambia' },
		// 				{ name: 'UNM49:288', label: 'Ghana' },
		// 				{ name: 'UNM49:624', label: 'Guinea-Bissau' },
		// 				{ name: 'UNM49:348', label: 'Hungary' },
		// 				{ name: 'UNM49:356', label: 'India' },
		// 				{ name: 'UNM49:360', label: 'Indonesia' },
		// 				{ name: 'UNM49:364', label: 'Iran' },
		// 				{ name: 'UNM49:368', label: 'Iraq' },
		// 				{ name: 'UNM49:404', label: 'Kenya' },
		// 				{ name: 'UNM49:426', label: 'Lesotho' },
		// 				{ name: 'UNM49:450', label: 'Madagascar' },
		// 				{ name: 'UNM49:454', label: 'Malawi' },
		// 				{ name: 'UNM49:466', label: 'Mali' },
		// 				{ name: 'UNM49:484', label: 'Mexico' },
		// 				{ name: 'UNM49:508', label: 'Mozambique' },
		// 				{ name: 'UNM49:524', label: 'Nepal' },
		// 				{ name: 'UNM49:558', label: 'Nicaragua' },
		// 				{ name: 'UNM49:562', label: 'Niger' },
		// 				{ name: 'UNM49:566', label: 'Nigeria' },
		// 				{ name: 'UNM49:586', label: 'Pakistan' },
		// 				{ name: 'UNM49:608', label: 'Philippines' },
		// 				{ name: 'UNM49:642', label: 'Romania' },
		// 				{ name: 'UNM49:643', label: 'Russia' },
		// 				{ name: 'UNM49:646', label: 'Rwanda' },
		// 				{ name: 'UNM49:686', label: 'Senegal' },
		// 				{ name: 'UNM49:688', label: 'Serbia' },
		// 				{ name: 'UNM49:694', label: 'Sierra Leone' },
		// 				{ name: 'UNM49:729', label: 'Sudan' },
		// 				{ name: 'UNM49:834', label: 'Tanzania' },
		// 				{ name: 'UNM49:764', label: 'Thailand' },
		// 				{ name: 'UNM49:768', label: 'Togo' },
		// 				{ name: 'UNM49:792', label: 'Turkey' },
		// 				{ name: 'UNM49:800', label: 'Uganda' },
		// 				{ name: 'UNM49:840', label: 'United States of America' },
		// 				{ name: 'UNM49:862', label: 'Venezuela' },
		// 				{ name: 'UNM49:704', label: 'Viet Nam' },
		// 				{ name: 'UNM49:894', label: 'Zambia' },
		// 				{ name: 'UNM49:716', label: 'Zimbabwe' },
		// 			],
		// 		},
		//
		// 		{ name: 'crop',
		// 			label: 'Crop',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'beverage_crops', label: '(beverage crops)' },
		// 				{ name: 'cereals', label: '(cereals)' },
		// 				{ name: 'cocoa', label: '(cocoa)' },
		// 				{ name: 'coffee', label: '(coffee)' },
		// 				{ name: 'culinary_herbs', label: '(culinary herbs)' },
		// 				{ name: 'feed_crops', label: '(feed crops)' },
		// 				{ name: 'fibre_crops', label: '(fibre crops)' },
		// 				{ name: 'fruits', label: '(fruits)' },
		// 				{ name: 'grain_crops', label: '(grain crops)' },
		// 				{ name: 'green_manures', label: '(green manures)' },
		// 				{ name: 'industrial_crops', label: '(industrial crops)' },
		// 				{ name: 'legumes', label: '(legumes)' },
		// 				{ name: 'nuts', label: '(nuts)' },
		// 				{ name: 'oil_crops', label: '(oil crops)' },
		// 				{ name: 'oil_seeds', label: '(oil seeds)' },
		// 				{ name: 'plant_fibres', label: '(plant fibres)' },
		// 				{ name: 'pseudocereals', label: '(pseudocereals)' },
		// 				{ name: 'pulses', label: '(pulses)' },
		// 				{ name: 'root_crops', label: '(root crops)' },
		// 				{ name: 'spices', label: '(spices)' },
		// 				{ name: 'stimulants', label: '(stimulants)' },
		// 				{ name: 'sugar_crops', label: '(sugar crops)' },
		// 				{ name: 'vegetables', label: '(vegetables)' },
		// 				{ name: 'abaca', label: 'abaca' },
		// 				{ name: 'acorns', label: 'acorns' },
		// 				{ name: 'adzuki_beans', label: 'adzuki beans' },
		// 				{ name: 'agave', label: 'agave' },
		// 				{ name: 'akees', label: 'akees' },
		// 				{ name: 'alfalfa', label: 'alfalfa' },
		// 				{ name: 'allspice', label: 'allspice' },
		// 				{ name: 'almonds', label: 'almonds' },
		// 				{ name: 'amaranth_grain', label: 'amaranth grain' },
		// 				{ name: 'amaranth_leaves', label: 'amaranth leaves' },
		// 				{ name: 'anise', label: 'anise' },
		// 				{ name: 'apples', label: 'apples' },
		// 				{ name: 'apricots', label: 'apricots' },
		// 				{ name: 'arabica_coffee', label: 'arabica coffee' },
		// 				{ name: 'areca_nuts', label: 'areca nuts' },
		// 				{ name: 'argan', label: 'argan' },
		// 				{ name: 'asparagus', label: 'asparagus' },
		// 				{ name: 'asparagus_beans', label: 'asparagus beans' },
		// 				{ name: 'asparagus_spears', label: 'asparagus spears' },
		// 				{ name: 'avocados', label: 'avocados' },
		// 				{ name: 'babassu_palm', label: 'babassu palm' },
		// 				{ name: 'balm', label: 'balm' },
		// 				{ name: 'bambara_groundnut', label: 'bambara groundnut' },
		// 				{ name: 'bananas', label: 'bananas' },
		// 				{ name: 'barley', label: 'barley' },
		// 				{ name: 'basil', label: 'basil' },
		// 				{ name: 'beans', label: 'beans' },
		// 				{ name: 'beetroot', label: 'beetroot' },
		// 				{ name: 'bergamot_orange', label: 'bergamot orange' },
		// 				{ name: 'bilberries', label: 'bilberries' },
		// 				{ name: 'black_currants', label: 'black currants' },
		// 				{ name: 'black_salsify', label: 'black salsify' },
		// 				{ name: 'blackberries', label: 'blackberries' },
		// 				{ name: 'blueberries', label: 'blueberries' },
		// 				{ name: 'borage_seed', label: 'borage seed' },
		// 				{ name: 'brassica_carinata', label: 'brassica carinata' },
		// 				{ name: 'brazil_nuts', label: 'brazil nuts' },
		// 				{ name: 'broccoli', label: 'broccoli' },
		// 				{ name: 'brussels_sprouts', label: 'brussels sprouts' },
		// 				{ name: 'buckwheat', label: 'buckwheat' },
		// 				{ name: 'cabbages', label: 'cabbages' },
		// 				{ name: 'cactus_pears', label: 'cactus pears' },
		// 				{ name: 'calamondins', label: 'calamondins' },
		// 				{ name: 'cannabis_sativa', label: 'cannabis sativa' },
		// 				{ name: 'cantaloupes', label: 'cantaloupes' },
		// 				{ name: 'carambolas', label: 'carambolas' },
		// 				{ name: 'cardamom', label: 'cardamom' },
		// 				{ name: 'cardoons', label: 'cardoons' },
		// 				{ name: 'carobs', label: 'carobs' },
		// 				{ name: 'carrots', label: 'carrots' },
		// 				{ name: 'cashews', label: 'cashews' },
		// 				{ name: 'cassabananas', label: 'cassabananas' },
		// 				{ name: 'cassava', label: 'cassava' },
		// 				{ name: 'cassava_leaves', label: 'cassava leaves' },
		// 				{ name: 'castor_beans', label: 'castor beans' },
		// 				{ name: 'catjang', label: 'catjang' },
		// 				{ name: 'cauliflowers', label: 'cauliflowers' },
		// 				{ name: 'celeriac', label: 'celeriac' },
		// 				{ name: 'celery', label: 'celery' },
		// 				{ name: 'celery_seeds', label: 'celery seeds' },
		// 				{ name: 'cherimoyas', label: 'cherimoyas' },
		// 				{ name: 'cherries', label: 'cherries' },
		// 				{ name: 'cherry_tomatoes', label: 'cherry tomatoes' },
		// 				{ name: 'chestnuts', label: 'chestnuts' },
		// 				{ name: 'chia_seeds', label: 'chia seeds' },
		// 				{ name: 'chickpeas', label: 'chickpeas' },
		// 				{ name: 'chicory', label: 'chicory' },
		// 				{ name: 'chicory_root', label: 'chicory root' },
		// 				{ name: 'chillies', label: 'chillies' },
		// 				{ name: 'chinotto', label: 'chinotto' },
		// 				{ name: 'chives', label: 'chives' },
		// 				{ name: 'cinnamon', label: 'cinnamon' },
		// 				{ name: 'citranges', label: 'citranges' },
		// 				{ name: 'citrons', label: 'citrons' },
		// 				{ name: 'citrus_fruits', label: 'citrus fruits' },
		// 				{ name: 'clementines', label: 'clementines' },
		// 				{ name: 'clover', label: 'clover' },
		// 				{ name: 'cloves', label: 'cloves' },
		// 				{ name: 'cocoa_beans', label: 'cocoa beans' },
		// 				{ name: 'coconuts', label: 'coconuts' },
		// 				{ name: 'common_beans', label: 'common beans' },
		// 				{ name: 'congusta_coffee', label: 'congusta coffee' },
		// 				{ name: 'coriander', label: 'coriander' },
		// 				{ name: 'cotton', label: 'cotton' },
		// 				{ name: 'cowpeas', label: 'cowpeas' },
		// 				{ name: 'cranberries', label: 'cranberries' },
		// 				{ name: 'crotalaria', label: 'crotalaria' },
		// 				{ name: 'crowberries', label: 'crowberries' },
		// 				{ name: 'cucumbers', label: 'cucumbers' },
		// 				{ name: 'cucurbit_fruits', label: 'cucurbit fruits' },
		// 				{ name: 'cumin', label: 'cumin' },
		// 				{ name: 'dates', label: 'dates' },
		// 				{ name: 'dewberries', label: 'dewberries' },
		// 				{ name: 'dragon_fruits', label: 'dragon fruits' },
		// 				{ name: 'dry_beans', label: 'dry beans' },
		// 				{ name: 'durians', label: 'durians' },
		// 				{ name: 'eggplants', label: 'eggplants' },
		// 				{ name: 'endives', label: 'endives' },
		// 				{ name: 'faba_beans', label: 'faba beans' },
		// 				{ name: 'fenugreek', label: 'fenugreek' },
		// 				{ name: 'figs', label: 'figs' },
		// 				{ name: 'finger_millet', label: 'finger millet' },
		// 				{ name: 'flax', label: 'flax' },
		// 				{ name: 'fonio', label: 'fonio' },
		// 				{ name: 'forage_legumes', label: 'forage legumes' },
		// 				{ name: 'garlic', label: 'garlic' },
		// 				{ name: 'ginger', label: 'ginger' },
		// 				{ name: 'globe_artichokes', label: 'globe artichokes' },
		// 				{ name: 'goji_berries', label: 'goji berries' },
		// 				{ name: 'gomenzer', label: 'gomenzer' },
		// 				{ name: 'gooseberries', label: 'gooseberries' },
		// 				{ name: 'grape_seeds', label: 'grape seeds' },
		// 				{ name: 'grapefruits', label: 'grapefruits' },
		// 				{ name: 'grapes', label: 'grapes' },
		// 				{ name: 'grapevines', label: 'grapevines' },
		// 				{ name: 'grass_pea', label: 'grass pea' },
		// 				{ name: 'green_beans', label: 'green beans' },
		// 				{ name: 'green_onions', label: 'green onions' },
		// 				{ name: 'groundnuts', label: 'groundnuts' },
		// 				{ name: 'guar', label: 'guar' },
		// 				{ name: 'guavas', label: 'guavas' },
		// 				{ name: 'hazelnuts', label: 'hazelnuts' },
		// 				{ name: 'hemp', label: 'hemp' },
		// 				{ name: 'horseradish', label: 'horseradish' },
		// 				{ name: 'jackfruit', label: 'jackfruit' },
		// 				{ name: 'jerusalem_artichokes', label: 'jerusalem artichokes' },
		// 				{ name: 'jojoba', label: 'jojoba' },
		// 				{ name: 'jute', label: 'jute' },
		// 				{ name: 'kaki', label: 'kaki' },
		// 				{ name: 'kales', label: 'kales' },
		// 				{ name: 'kapok', label: 'kapok' },
		// 				{ name: 'kenaf', label: 'kenaf' },
		// 				{ name: 'kiwifruits', label: 'kiwifruits' },
		// 				{ name: 'kohlrabi', label: 'kohlrabi' },
		// 				{ name: 'kola_nuts', label: 'kola nuts' },
		// 				{ name: 'kumquats', label: 'kumquats' },
		// 				{ name: 'lablab', label: 'lablab' },
		// 				{ name: 'leeks', label: 'leeks' },
		// 				{ name: 'lemon_grass', label: 'lemon grass' },
		// 				{ name: 'lemons', label: 'lemons' },
		// 				{ name: 'lentils', label: 'lentils' },
		// 				{ name: 'lettuces', label: 'lettuces' },
		// 				{ name: 'liberica_coffee', label: 'liberica coffee' },
		// 				{ name: 'limequats', label: 'limequats' },
		// 				{ name: 'limes', label: 'limes' },
		// 				{ name: 'lingonberries', label: 'lingonberries' },
		// 				{ name: 'linseed', label: 'linseed' },
		// 				{ name: 'litchis', label: 'litchis' },
		// 				{ name: 'little_millet', label: 'little millet' },
		// 				{ name: 'loganberries', label: 'loganberries' },
		// 				{ name: 'longans', label: 'longans' },
		// 				{ name: 'loquats', label: 'loquats' },
		// 				{ name: 'lotus_root', label: 'lotus root' },
		// 				{ name: 'lucerne', label: 'lucerne' },
		// 				{ name: 'lucumas', label: 'lucumas' },
		// 				{ name: 'macadamia_nuts', label: 'macadamia nuts' },
		// 				{ name: 'mace', label: 'mace' },
		// 				{ name: 'maize', label: 'maize' },
		// 				{ name: 'mandarins', label: 'mandarins' },
		// 				{ name: 'mangoes', label: 'mangoes' },
		// 				{ name: 'mangosteens', label: 'mangosteens' },
		// 				{ name: 'mate', label: 'mate' },
		// 				{ name: 'microgreens', label: 'microgreens' },
		// 				{ name: 'millets', label: 'millets' },
		// 				{ name: 'mint', label: 'mint' },
		// 				{ name: 'mulberries', label: 'mulberries' },
		// 				{ name: 'mung_beans', label: 'mung beans' },
		// 				{ name: 'mushrooms', label: 'mushrooms' },
		// 				{ name: 'muskmelons', label: 'muskmelons' },
		// 				{ name: 'mustard_seed', label: 'mustard seed' },
		// 				{ name: 'nectarines', label: 'nectarines' },
		// 				{ name: 'noug', label: 'noug' },
		// 				{ name: 'nutmegs', label: 'nutmegs' },
		// 				{ name: 'oats', label: 'oats' },
		// 				{ name: 'oil_palms', label: 'oil palms' },
		// 				{ name: 'okras', label: 'okras' },
		// 				{ name: 'olives', label: 'olives' },
		// 				{ name: 'onions', label: 'onions' },
		// 				{ name: 'orangequats', label: 'orangequats' },
		// 				{ name: 'oranges', label: 'oranges' },
		// 				{ name: 'oregano', label: 'oregano' },
		// 				{ name: 'palm_hearts', label: 'palm hearts' },
		// 				{ name: 'palm_kernels', label: 'palm kernels' },
		// 				{ name: 'papayas', label: 'papayas' },
		// 				{ name: 'paprika', label: 'paprika' },
		// 				{ name: 'parsley', label: 'parsley' },
		// 				{ name: 'parsley_root', label: 'parsley root' },
		// 				{ name: 'parsnips', label: 'parsnips' },
		// 				{ name: 'passion_fruits', label: 'passion fruits' },
		// 				{ name: 'pawpaws', label: 'pawpaws' },
		// 				{ name: 'peaches', label: 'peaches' },
		// 				{ name: 'pearl_millet', label: 'pearl millet' },
		// 				{ name: 'pears', label: 'pears' },
		// 				{ name: 'peas', label: 'peas' },
		// 				{ name: 'pecans', label: 'pecans' },
		// 				{ name: 'pepino', label: 'pepino' },
		// 				{ name: 'pepper', label: 'pepper' },
		// 				{ name: 'peppermint', label: 'peppermint' },
		// 				{ name: 'perilla_seed', label: 'perilla seed' },
		// 				{ name: 'pigeon_peas', label: 'pigeon peas' },
		// 				{ name: 'pineapples', label: 'pineapples' },
		// 				{ name: 'pistachios', label: 'pistachios' },
		// 				{ name: 'plantains', label: 'plantains' },
		// 				{ name: 'plums', label: 'plums' },
		// 				{ name: 'pomegranates', label: 'pomegranates' },
		// 				{ name: 'poppy_seed', label: 'poppy seed' },
		// 				{ name: 'potatoes', label: 'potatoes' },
		// 				{ name: 'pummelos', label: 'pummelos' },
		// 				{ name: 'pumpkin_seeds', label: 'pumpkin seeds' },
		// 				{ name: 'pumpkins', label: 'pumpkins' },
		// 				{ name: 'quinces', label: 'quinces' },
		// 				{ name: 'quinoa', label: 'quinoa' },
		// 				{ name: 'radicchio', label: 'radicchio' },
		// 				{ name: 'radishes', label: 'radishes' },
		// 				{ name: 'rambutans', label: 'rambutans' },
		// 				{ name: 'ramie', label: 'ramie' },
		// 				{ name: 'rapeseed', label: 'rapeseed' },
		// 				{ name: 'raspberries', label: 'raspberries' },
		// 				{ name: 'red_currants', label: 'red currants' },
		// 				{ name: 'rhubarb', label: 'rhubarb' },
		// 				{ name: 'rice', label: 'rice' },
		// 				{ name: 'robusta_coffee', label: 'robusta coffee' },
		// 				{ name: 'rocket', label: 'rocket' },
		// 				{ name: 'root_vegetables', label: 'root vegetables' },
		// 				{ name: 'rose_hips', label: 'rose hips' },
		// 				{ name: 'roselle', label: 'roselle' },
		// 				{ name: 'rosemary', label: 'rosemary' },
		// 				{ name: 'rubber_crops', label: 'rubber crops' },
		// 				{ name: 'rutabagas', label: 'rutabagas' },
		// 				{ name: 'rye', label: 'rye' },
		// 				{ name: 'safflower_seed', label: 'safflower seed' },
		// 				{ name: 'saffron', label: 'saffron' },
		// 				{ name: 'safou', label: 'safou' },
		// 				{ name: 'sage', label: 'sage' },
		// 				{ name: 'salsify', label: 'salsify' },
		// 				{ name: 'satsumas', label: 'satsumas' },
		// 				{ name: 'seakale', label: 'seakale' },
		// 				{ name: 'sesame_seed', label: 'sesame seed' },
		// 				{ name: 'sesbania', label: 'sesbania' },
		// 				{ name: 'shallots', label: 'shallots' },
		// 				{ name: 'shea_nuts', label: 'shea nuts' },
		// 				{ name: 'sisal', label: 'sisal' },
		// 				{ name: 'soft_fruits', label: 'soft fruits' },
		// 				{ name: 'sorghum', label: 'sorghum' },
		// 				{ name: 'sour_cherries', label: 'sour cherries' },
		// 				{ name: 'soybeans', label: 'soybeans' },
		// 				{ name: 'spinach', label: 'spinach' },
		// 				{ name: 'squashes', label: 'squashes' },
		// 				{ name: 'stone_fruits', label: 'stone fruits' },
		// 				{ name: 'strawberries', label: 'strawberries' },
		// 				{ name: 'sugar_beet', label: 'sugar beet' },
		// 				{ name: 'sugar_cane', label: 'sugar cane' },
		// 				{ name: 'sumac', label: 'sumac' },
		// 				{ name: 'sunflower_seed', label: 'sunflower seed' },
		// 				{ name: 'sunflowers', label: 'sunflowers' },
		// 				{ name: 'sunn_hemp', label: 'sunn hemp' },
		// 				{ name: 'sweet_cherries', label: 'sweet cherries' },
		// 				{ name: 'sweet_corn', label: 'sweet corn' },
		// 				{ name: 'sweet_peppers', label: 'sweet peppers' },
		// 				{ name: 'sweet_potatoes', label: 'sweet potatoes' },
		// 				{ name: 'taioba', label: 'taioba' },
		// 				{ name: 'tangelos', label: 'tangelos' },
		// 				{ name: 'tangerines', label: 'tangerines' },
		// 				{ name: 'tangors', label: 'tangors' },
		// 				{ name: 'taro', label: 'taro' },
		// 				{ name: 'tea', label: 'tea' },
		// 				{ name: 'teff', label: 'teff' },
		// 				{ name: 'temperate_fruits', label: 'temperate fruits' },
		// 				{ name: 'thyme', label: 'thyme' },
		// 				{ name: 'tobacco', label: 'tobacco' },
		// 				{ name: 'tobacco_seed', label: 'tobacco seed' },
		// 				{ name: 'tomatoes', label: 'tomatoes' },
		// 				{ name: 'triticales', label: 'triticales' },
		// 				{ name: 'tropical_fruits', label: 'tropical fruits' },
		// 				{ name: 'tung_tree', label: 'tung tree' },
		// 				{ name: 'turnips', label: 'turnips' },
		// 				{ name: 'urd_beans', label: 'urd beans' },
		// 				{ name: 'vanilla', label: 'vanilla' },
		// 				{ name: 'velvet_bean', label: 'velvet bean' },
		// 				{ name: 'vetches', label: 'vetches' },
		// 				{ name: 'walnuts', label: 'walnuts' },
		// 				{ name: 'watercress', label: 'watercress' },
		// 				{ name: 'watermelons', label: 'watermelons' },
		// 				{ name: 'wheat', label: 'wheat' },
		// 				{ name: 'white_currants', label: 'white currants' },
		// 				{ name: 'winter_melons', label: 'winter melons' },
		// 				{ name: 'yams', label: 'yams' },
		// 				{ name: 'yautia', label: 'yautia' },
		// 				{ name: 'NA', label: 'NA' },
		//
		// 			],
		// 		},
		//
		// 		{ name: 'planting_year',
		// 			label: 'Planting Year',
		// 			inputType: 'number',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }, { name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }],
		// 			defaultValue: new Date().getFullYear(),
		// 			validator: ({ value }) => testYear(value),
		// 		},
		//
		// 		{ name: 'harvesting_year',
		// 			label: 'Harvesting Year',
		// 			inputType: 'number',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }, { name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }],
		// 			defaultValue: new Date().getFullYear(),
		// 			validator: ({ value }) => testYear(value),
		// 		},
		//
		// 		{ name: 'yield', label: 'Yield (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'total_biomass', label: 'Dry weight biomass (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'inorganic_fertilizer',
		// 			label: 'Inorganic Fertilizer',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'AmmoniumSulfate', label: 'AmmoniumSulfate' },
		// 				{ name: 'BasicSlag', label: 'BasicSlag' },
		// 				{ name: 'CalciumAmmoniumNitrate', label: 'CalciumAmmoniumNitrate' },
		// 				{ name: 'DiammoniumPhosphate', label: 'DiammoniumPhosphate' },
		// 				{ name: 'Gypsum', label: 'Gypsum' },
		// 				{ name: 'Limestone', label: 'Limestone' },
		// 				{ name: 'NpkFertilizer', label: 'NpkFertilizer' },
		// 				{ name: 'PkFertilizer', label: 'PkFertilizer' },
		// 				{ name: 'PotassiumChloride', label: 'PotassiumChloride' },
		// 				{ name: 'PotassiumNitrate', label: 'PotassiumNitrate' },
		// 				{ name: 'PotassiumSulfate', label: 'PotassiumSulfate' },
		// 				{ name: 'RockPhosphate', label: 'RockPhosphate' },
		// 				{ name: 'Superphosphate', label: 'Superphosphate' },
		// 				{ name: 'Sympal', label: 'Sympal' },
		// 				{ name: 'TripleSuperphosphate', label: 'TripleSuperphosphate' },
		// 				{ name: 'Urea', label: 'Urea' },
		// 				{ name: 'ZincSulfate', label: 'ZincSulfate' },
		// 				{ name: 'NA', label: 'NA' },
		//
		// 			],
		// 		},
		//
		// 		{ name: 'organic_fertilizer',
		// 			label: 'Organic Fertilizer',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'AnimalManure', label: 'AnimalManure' },
		// 				{ name: 'Biochar', label: 'Biochar' },
		// 				{ name: 'Compost', label: 'Compost' },
		// 				{ name: 'NA', label: 'NA' },
		// 			],
		// 		},
		//
		// 		{ name: 'N_fertilizer', label: 'N applied in inorganic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'P_fertilizer', label: 'P applied in inorganic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'K_fertilizer', label: 'K applied in inorganic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'Zn_fertilizer', label: 'Zn applied in inorganic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'S_fertilizer', label: 'S applied in inorganic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'OM_N', label: 'N applied in organic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'OM_P', label: 'P applied in organic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'OM_K', label: 'K applied in organic fertilizer (kg/ha)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'soil_ph', label: 'Soil PH', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testPercentage(value) },
		// 		{ name: 'soil_SOC', label: 'Soil SOC (%)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testPercentage(value) },
		// 		{ name: 'soil_sand', label: 'Soil Sand (%)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testPercentage(value) },
		// 		{ name: 'soil_clay', label: 'Soil Clay (%)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testPercentage(value) },
		// 		{ name: 'soil_silt', label: 'Soil Silt (%)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testPercentage(value) },
		//
		// 		{ name: 'tillage',
		// 			label: 'Tillage',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'Conventional', label: 'Conventional' },
		// 				{ name: 'Deeptill', label: 'Deeptill' },
		// 				{ name: 'Notill', label: 'Notill' },
		// 				{ name: 'Reducedtill', label: 'Reducedtill' },
		// 				{ name: 'Ridgetill', label: 'Ridgetill' },
		// 				{ name: 'NA', label: 'NA' },
		// 			],
		// 		},
		//
		// 		{ name: 'irrigated',
		// 			label: 'Irrigated',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'TRUE', label: 'TRUE' },
		// 				{ name: 'FALSE', label: 'FALSE' },
		// 				{ name: 'NA', label: 'NA' },
		// 			],
		// 		},
		//
		// 		{ name: 'rain', label: 'Accumulated rainfall (mm)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 	]
		// 	);
		// }
		// else {
		// 	setFields([
		//
		// 		{ name: 'dataset_id', label: 'Dataset ID', operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'HHID', label: 'Household ID', operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'regions',
		// 			label: 'Region',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'UNM49:001', label: 'World' },
		// 				{ name: 'UNM49:002', label: 'Africa' },
		// 				{ name: 'UNM49:202', label: 'Africa / Sub-Saharan Africa' },
		// 				{ name: 'UNM49:011', label: 'Africa / Sub-Saharan Africa / Western Africa' },
		// 			],
		// 		},
		//
		// 		{ name: 'country',
		// 			label: 'Country',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'UNM49:566', label: 'Nigeria' },
		// 			],
		// 		},
		//
		// 		{ name: 'crop',
		// 			label: 'Crop',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'Rice', label: 'Rice' },
		// 			],
		// 		},
		//
		// 		{ name: 'harvesting_year',
		// 			label: 'Harvesting Year',
		// 			inputType: 'number',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }, { name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }],
		// 			defaultValue: new Date().getFullYear(),
		// 			validator: ({ value }) => testYear(value),
		// 		},
		//
		// 		{ name: 'SSR_Yha', label: 'Fresh grain yield (t/ha) - SSR @14% moisture', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'BRR_Yha', label: 'Fresh grain yield (t/ha) - BRR @14% moisture', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'ZCC_Yha', label: 'Fresh grain yield (t/ha) - ZCC @14% moisture', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'riceSystem',
		// 			label: 'Irrigation Type',
		// 			operators: [{ name: '=', label: 'is' }, { name: '!=', label: 'is not' }],
		// 			valueEditorType: 'select',
		// 			values: [
		// 				{ name: 'irrigated', label: 'irrigated' },
		// 				{ name: 'rainfedLowland', label: 'rainfedLowland' },
		// 			],
		// 		},
		//
		// 		{ name: 'incrSSR', label: 'Yield difference of fertilized vs non-fertilized plots (SSR)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'incrBRR', label: 'Yield difference of fertilized vs non-fertilized plots (BRR)', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'income_SSR', label: 'Income (USD) - SSR', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'income_BRR', label: 'Income (USD) - BRR', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'income_ZCC', label: 'Income (USD) - ZCC', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'rateN', label: 'N applied (kg/ha) - SSR', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'rateN_BRR', label: 'N applied (kg/ha) - BRR', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 		{ name: 'rateP', label: 'P applied (kg/ha) - SSR', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		// 		{ name: 'rateP_BRR', label: 'P applied (kg/ha) - BRR', inputType: 'number', operators: [{ name: '>=', label: 'is greater than or equal to' }, { name: '<=', label: 'is less than or equal to' }], validator: ({ value }) => testEmpty(value) },
		//
		// 	]);
		// }
	}, []);

	const preparedTranslations = {
		fields: {
			title: 'Fields',
		},
		operators: {
			title: 'Operators',
		},
		value: {
			title: 'Value',
		},
		removeRule: {
			label: deleteIcon || <p style={{margin: 0}}>X</p>,
			title: 'Remove rule',
		},
		removeGroup: {
			label: deleteIcon || <p style={{margin: 0}}>X</p>,
			title: 'Remove group',
		},
		addRule: {
			label: <span>{addIcon} Rule</span> || <span><i>+</i> Rule</span>,
			title: 'Add rule',
		},
		addGroup: {
			label: <span>{addIcon} Group</span> || <span><i>+</i> Group</span>,
			title: 'Add group',
		},
		combinators: {
			title: 'Combinators',
		},
		notToggle: {
			title: 'Invert this group',
		},
	};

	const testYear = (value) => {
		if ((!value) || (value === '')) {
			return false;
		}
        
		const current_year = new Date().getFullYear();
		if ((value >= 1968) && (value <= current_year)) {
			return true;
		}
            
		return false;
	};

	const testPercentage = (value) => {
		if ((!value) || (value === '')) {
			return false;
		}
        
		if ((value >= 0) && (value <= 100)) {
			return true;
		}
            
		return false;
	};

	const testEmpty = (value) => {
		if (!value) {
			return false;
		}
        
		const trimStr = value.replace(/\s+/g, '');

		if (trimStr === '') {
			return false;
		}
            
		return true;
	};

	return (
		<>
			{fields
				? (	<div className="with-bootstrap">
					<QueryBuilder
						query={query}
						fields={fields}
						addRuleToNewGroups
						validator={defaultValidator}
						controlClassnames="with-bootstrap"
						translations={preparedTranslations}
						onQueryChange={logQuery}
						controlElements="with-bootstrap"
						showCloneButtons
					/>
				</div>)
				: null}
		</>

	);
};

export default AdvancedSearch;
