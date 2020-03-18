import {mainLizmap, mainEventDispatcher} from '../modules/Globals.js';

export default class SelectionTool {

    constructor() {

        this._layers = [];
        this._allFeatureTypeSelected = [];

        this._tools = ['deactivate', 'box', 'circle', 'polygon', 'freehand'];
        this._toolSelected = this._tools[0];

        this._geomOperator = 'intersects';

        this._newAddRemove = ['new', 'add', 'remove'];
        this._newAddRemoveSelected = this._newAddRemove[0];

        // Verifying WFS layers
        const featureTypes = mainLizmap.vectorLayerFeatureTypes;
        if (featureTypes.length === 0) {
            if (document.getElementById('button-selectiontool')){
                document.getElementById('button-selectiontool').parentNode.remove();
            }
            return false;
        }

        const config = mainLizmap.config;

        for (const attributeLayerName in config.attributeLayers) {
            if (config.attributeLayers.hasOwnProperty(attributeLayerName)) {
                featureTypes.each((index, featureType) => {
                    const lname = mainLizmap.getNameByTypeName($(featureType).find('Name').text());

                    if (attributeLayerName === lname
                        && lname in config.layers
                        && config.layers[lname]['geometryType'] != 'none'
                        && config.layers[lname]['geometryType'] != 'unknown') {

                        this._layers.push({
                            name: lname,
                            title: config.layers[lname].title
                        });

                        this._allFeatureTypeSelected.push(lname);
                    }
                });
            }
        }

        if (this._layers.length === 0) {
            document.getElementById('button-selectiontool').parentNode.remove();
            return false;
        }

        // List of WFS format
        this._exportFormats = mainLizmap.vectorLayerResultFormat.filter(
            format => !['GML2', 'GML3', 'GEOJSON'].includes(format.tagName)
        );

        // Draw and selection tools style
        const drawStyle = new OpenLayers.Style({
            pointRadius: 7,
            fillColor: '#94EF05',
            fillOpacity: 0.3,
            strokeColor: 'yellow',
            strokeOpacity: 1,
            strokeWidth: 3
        });

        const drawStyleTemp = new OpenLayers.Style({
            pointRadius: 7,
            fillColor: 'orange',
            fillOpacity: 0.3,
            strokeColor: 'blue',
            strokeOpacity: 1,
            strokeWidth: 3
        });

        const drawStyleSelect = new OpenLayers.Style({
            pointRadius: 7,
            fillColor: 'blue',
            fillOpacity: 0.3,
            strokeColor: 'blue',
            strokeOpacity: 1,
            strokeWidth: 3
        });

        const drawStyleMap = new OpenLayers.StyleMap({
            'default': drawStyle,
            'temporary': drawStyleTemp,
            'select': drawStyleSelect
        });

        const queryLayer = new OpenLayers.Layer.Vector('selectionQueryLayer', {styleMap: drawStyleMap});
        mainLizmap.lizmap3.map.addLayers([queryLayer]);
        mainLizmap.lizmap3.layers['selectionQueryLayer'] = queryLayer;

        mainLizmap.lizmap3.controls['selectiontool'] = {};

        const onQueryFeatureAdded = (feature) => {
            /**
             * @todo Ne gère que si il ya a seulement 1 géométrie
             */
            if (feature.layer) {
                if (feature.layer.features.length > 1) {
                    feature.layer.destroyFeatures(feature.layer.features.shift());
                }
            }

            for (const featureType of this.allFeatureTypeSelected) {
                mainLizmap.lizmap3.selectLayerFeaturesFromSelectionFeature(featureType, feature, this._geomOperator);
            }
        };

        /**
         * Box
         * @type @new;OpenLayers.Control.DrawFeature
         */
        const queryBoxLayerCtrl = new OpenLayers.Control.DrawFeature(queryLayer,
            OpenLayers.Handler.RegularPolygon,
            {handlerOptions: {sides: 4, irregular: true}, 'featureAdded': onQueryFeatureAdded}
        );

        /**
         * Circle
         * @type @new;OpenLayers.Control.DrawFeature
         */
        const queryCircleLayerCtrl = new OpenLayers.Control.DrawFeature(queryLayer,
            OpenLayers.Handler.RegularPolygon,
            {handlerOptions: {sides: 40}, 'featureAdded': onQueryFeatureAdded}
        );

        /**
         * Polygon
         * @type @new;OpenLayers.Control.DrawFeature
         */
        const queryPolygonLayerCtrl = new OpenLayers.Control.DrawFeature(
            queryLayer,
            OpenLayers.Handler.Polygon,
            {
                'featureAdded': onQueryFeatureAdded,
                styleMap: drawStyleMap,
                eventListeners: {
                    // getFeatureInfo and polygon draw controls are mutually exclusive
                    'activate': function() {
                        if ('featureInfo' in lizMap.controls && lizMap.controls.featureInfo && lizMap.controls.featureInfo.active) {
                            lizMap.controls.featureInfo.deactivate();
                        }
                    },
                    'deactivate': function() {
                        if ('featureInfo' in lizMap.controls && lizMap.controls.featureInfo && !lizMap.controls.featureInfo.active) {
                            lizMap.controls.featureInfo.activate();
                        }
                    }
                }
            }
        );

        /**
         * Freehand
         * @type @new;OpenLayers.Control.DrawFeature
         */
        const queryFreehandLayerCtrl = new OpenLayers.Control.DrawFeature(queryLayer,
            OpenLayers.Handler.Polygon, {
                'featureAdded': onQueryFeatureAdded, styleMap: drawStyleMap,
                handlerOptions: {freehand: true}
            }
        );

        // TODO : keep reference to controls in this class
        mainLizmap.lizmap3.map.addControls([queryBoxLayerCtrl, queryCircleLayerCtrl, queryPolygonLayerCtrl, queryFreehandLayerCtrl]);

        mainLizmap.lizmap3.controls['selectiontool']['queryBoxLayerCtrl'] = queryBoxLayerCtrl;
        mainLizmap.lizmap3.controls['selectiontool']['queryCircleLayerCtrl'] = queryCircleLayerCtrl;
        mainLizmap.lizmap3.controls['selectiontool']['queryPolygonLayerCtrl'] = queryPolygonLayerCtrl;
        mainLizmap.lizmap3.controls['selectiontool']['queryFreehandLayerCtrl'] = queryFreehandLayerCtrl;

        mainLizmap.lizmap3.events.on({
            'minidockopened': (mdoEvt) => {
                if (mdoEvt.id == 'selectiontool') {
                    this.toolSelected = 'deactivate';
                    mainLizmap.lizmap3.layers['selectionQueryLayer'].destroyFeatures();
                    mainLizmap.lizmap3.layers['selectionQueryLayer'].setVisibility(true);
                }
            },
            'minidockclosed': (mdcEvt) => {
                if (mdcEvt.id == 'selectiontool') {
                    this.toolSelected = 'deactivate';
                    mainLizmap.lizmap3.layers['selectionQueryLayer'].destroyFeatures();
                    mainLizmap.lizmap3.layers['selectionQueryLayer'].setVisibility(false);
                }
            },
            'layerSelectionChanged': () => {
                mainEventDispatcher.dispatch('selectionTool.selectionChanged');
            },
            'layerFilteredFeaturesChanged': (lffcEvt) => {
                if ($('#mapmenu li.selectiontool').hasClass('active') &&
                    this.allFeatureTypeSelected.includes(lffcEvt.featureType)) {
                    mainEventDispatcher.dispatch('selectionTool.filteredFeaturesChanged');
                }
            }
        });
    }

    get layers() {
        return this._layers;
    }

    get exportFormats() {
        return this._exportFormats;
    }

    get selectedFeaturesCount() {
        let count = 0;

        for (const featureType of this.allFeatureTypeSelected) {
            if (featureType in mainLizmap.config.layers &&
                'selectedFeatures' in mainLizmap.config.layers[featureType]
                && mainLizmap.config.layers[featureType]['selectedFeatures'].length) {
                count += mainLizmap.config.layers[featureType]['selectedFeatures'].length;
            }
        }

        return count;
    }

    get filterActive() {
        return mainLizmap.lizmap3.lizmapLayerFilterActive;
    }

    set filterActive(active) {
        mainLizmap.lizmap3.lizmapLayerFilterActive = active;
    }

    get filteredFeaturesCount() {
        let count = 0;

        for (const featureType of this.allFeatureTypeSelected) {
            if (featureType in mainLizmap.config.layers &&
                'filteredFeatures' in mainLizmap.config.layers[featureType]) {
                count += mainLizmap.config.layers[featureType]['filteredFeatures'].length;
            }
        }

        return count;
    }

    get allFeatureTypeSelected() {
        return this._allFeatureTypeSelected;
    }

    set allFeatureTypeSelected(featureType) {
        if (this._allFeatureTypeSelected !== featureType) {
            if (featureType === 'selectable-layers') {
                this._allFeatureTypeSelected = this.layers.map(layer => layer.name);
            } else if (featureType === 'selectable-visible-layers') {
                this._allFeatureTypeSelected = this.layers.map(layer => layer.name).filter(layerName => {
                    for (let index = 0; index < mainLizmap.lizmap3.map.layers.length; index++) {
                        if (mainLizmap.lizmap3.map.layers[index].visibility
                            && mainLizmap.lizmap3.map.layers[index].name === layerName) {
                            return true;
                        }
                    }
                });
            } else {
                this._allFeatureTypeSelected = [featureType];
            }

            mainEventDispatcher.dispatch('selectionTool.allFeatureTypeSelected');
        }
    }

    get toolSelected() {
        return this._toolSelected;
    }

    set toolSelected(tool) {
        if (this._tools.includes(tool)) {
            // Disable all tools then enable the chosen one
            for (const key in mainLizmap.lizmap3.controls.selectiontool) {
                mainLizmap.lizmap3.controls.selectiontool[key].deactivate();
            }

            switch (tool) {
            case this._tools[1]:
                mainLizmap.lizmap3.controls.selectiontool.queryBoxLayerCtrl.activate();
                break;
            case this._tools[2]:
                mainLizmap.lizmap3.controls.selectiontool.queryCircleLayerCtrl.activate();
                break;
            case this._tools[3]:
                mainLizmap.lizmap3.controls.selectiontool.queryPolygonLayerCtrl.activate();
                break;
            case this._tools[4]:
                mainLizmap.lizmap3.controls.selectiontool.queryFreehandLayerCtrl.activate();
                break;
            }

            this._toolSelected = tool;
            mainEventDispatcher.dispatch('selectionTool.toolSelected');
        }
    }

    set geomOperator(geomOperator) {
        if (this._geomOperator !== geomOperator){
            this._geomOperator = geomOperator;
        }
    }

    get newAddRemoveSelected() {
        return this._newAddRemoveSelected;
    }

    set newAddRemoveSelected(newAddRemove) {
        if (this._newAddRemove.includes(newAddRemove)) {
            this._newAddRemoveSelected = newAddRemove;

            mainEventDispatcher.dispatch('selectionTool.newAddRemoveSelected');
        }
    }

    disable() {
        const btnSelectionTool = document.getElementById('button-selectiontool');

        if (btnSelectionTool.parentElement.classList.contains('active')) {
            btnSelectionTool.click();
        }
    }

    unselect() {
        for (const featureType of this.allFeatureTypeSelected) {
            mainLizmap.lizmap3.events.triggerEvent('layerfeatureunselectall',
                {'featureType': featureType, 'updateDrawing': true}
            );
        }
    }

    filter() {
        if (this.filteredFeaturesCount) {
            for (const featureType of this.allFeatureTypeSelected) {
                mainLizmap.lizmap3.events.triggerEvent('layerfeatureremovefilter',
                    {'featureType': featureType}
                );
            }
            this.filterActive = null;
        } else {
            for (const featureType of this.allFeatureTypeSelected) {
                if (featureType in mainLizmap.config.layers &&
                    'selectedFeatures' in mainLizmap.config.layers[featureType]
                    && mainLizmap.config.layers[featureType]['selectedFeatures'].length) {
                    this.filterActive = featureType;

                    mainLizmap.lizmap3.events.triggerEvent('layerfeaturefilterselected',
                        {'featureType': featureType}
                    );
                }
            }
        }
    }

    // Invert selection on for single layers
    invert(mfeatureType) {
        const featureType = mfeatureType ? mfeatureType : this.allFeatureTypeSelected[0];

        if (featureType in mainLizmap.config.layers &&
            'selectedFeatures' in mainLizmap.config.layers[featureType]
            && mainLizmap.config.layers[featureType]['selectedFeatures'].length) {

            // Get all features
            mainLizmap.lizmap3.getFeatureData(featureType, null, null, 'extent', false, null, null,
                (aName, aFilter, cFeatures, cAliases) => {
                    const invertSelectionIds = [];
                    for (const feat of cFeatures) {
                        const fid = feat.id.split('.')[1];

                        if (!mainLizmap.config.layers[aName]['selectedFeatures'].includes(fid)) {
                            invertSelectionIds.push(fid);
                        }
                    }

                    mainLizmap.config.layers[featureType]['selectedFeatures'] = invertSelectionIds;

                    mainLizmap.lizmap3.events.triggerEvent('layerSelectionChanged',
                        {
                            'featureType': featureType,
                            'featureIds': '40',
                            'updateDrawing': true
                        }
                    );
                });
        }
    }

    export(format) {
        if (format == 'GML') {
            format = 'GML3';
        }
        mainLizmap.lizmap3.exportVectorLayer(this.allFeatureTypeSelected, format, false);
    }
}
