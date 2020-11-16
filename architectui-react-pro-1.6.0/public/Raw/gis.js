let ip_gis = 'http://localhost:8010/'
let layers = [];
let basemap_options = ['None'];

function loadBasemap() {
    let call = getListBasemap()
    call.then(val => {
        basemap_options = ['None'];
        layers = val.data;
        refreshPanel();
    })
}

async function getListBasemap() {
    let res = await fetch(ip_gis + 'gis/get_basemap').then(resp => {
        if (!resp.ok)
            throw Error('There is something wrong')
        return resp.json();
    })
    return res;
}

loadBasemap();

let map = new ol.Map({
    target: 'map',
    view: new ol.View({
        center: [11289537.372839676, 398316.8873260389],
        zoom: 8,
    })
});

var popupContainer = document.getElementById('popup');
var popupOverlay = new ol.Overlay({
    id: 'popupOverlay',
    element: popupContainer
});

map.addOverlay(popupOverlay);

let mousePosition = new ol.control.MousePosition({
    projection: 'EPSG:4326',
    coordinateFormat: ol.coordinate.createStringXY(4),
    target: document.getElementById('mouse-position'),
    className: 'custom-mouse-position lnr-frame-contract',
    undefinedHTML: '&nbsp;'
});

let geo = new ol.Geolocation({
    tracking: true,
    projection: map.getView().getProjection()
});

let presetCenter;
let presetZoom;
geo.on('change:position', () => {
    presetCenter = geo.getPosition()
    presetZoom = map.getView().getZoom();
});

map.addControl(mousePosition);

map.addControl(new ol.control.FullScreen({
    source: 'fullscreen'
}))
map.addControl(new ol.control.OverviewMap())
map.addControl(new ol.control.ScaleLine())

let enabled_panel = '';

let basemapPanel = document.getElementById('basemap-sidepanel')

function refreshPanel() {
    basemapPanel.children[1].innerHTML = ''

    layers.forEach((v) => {
        basemap_options.push(v.name);
        let layer = convertLayer(v)
        map.addLayer(layer);
    })

    basemap_options.forEach((name) => {
        let node = document.createElement('label')
        node.style.textAlign = 'center';
        node.style.marginRight = '10px';
        if (name === 'None')
            node.innerHTML = '<input type="radio" class="thumbnil" name="basemap" value="' + name + '" checked/>';
        else
            node.innerHTML = '<input type="radio" class="thumbnil" name="basemap" value="' + name + '"/>';

        node.innerHTML += '<img class="img-thumbnail" style="color:white;width:100px;height:70px;" src="' + ip_gis + 'static/uploads/basemap/' + name + '.jpg" alt="' + name + '">' +
            '<div style="word-break: break-word;max-width: 100px;font-size:13px">' + name + '</div>'

        node.children[0].addEventListener('click', (e) => {
            let layers = map.getLayers().getArray()

            layers.forEach(v => {
                if (basemap_options.includes(v.get('name')))
                    v.set('visible', v.get('name') === e.target.value)
            })

        });

        basemapPanel.children[1].appendChild(node);
    })
}

// basemapBtn panel show/hide
let basemapBtn = document.getElementById('basemapBtn')
basemapBtn.addEventListener('click', () => {
    // hidePanel();
    if (['none', ''].includes(basemapPanel.style.display)) {
        basemapPanel.style.display = 'block'
        hidePanel();
        enabled_panel = 'basemap';
    } else {
        basemapPanel.style.display = 'none'
        enabled_panel = '';
    }
})
map.addControl(new ol.control.Control({element: basemapBtn}));

// layerBtn panel show/hide
let layerPanel = document.getElementById('layer-sidepanel')

let layerBtn = document.getElementById('layerBtn')
layerBtn.addEventListener('click', () => {

    if (['none', ''].includes(layerPanel.style.display)) {
        layerPanel.style.display = 'block'
        hidePanel();
        enabled_panel = 'layer';
    } else {
        layerPanel.style.display = 'none'
        enabled_panel = '';
    }
})
map.addControl(new ol.control.Control({element: layerBtn}));

// drawBtn panel show/hide
let drawList = document.getElementById('listDrawing')

function loadDrawing() {
    drawList.innerHTML = '<tr><td colspan="3">List is fetching data...</td></tr>'
    let call = getListDrawing()
    call.then(val => {
        if (val.status !== 'OK') {
            drawList.innerHTML = '<tr><td colspan="3">There is an error while fetching data</td></tr>'
            throw Error('Status returned is not OK')
        }

        refreshDrawingList(val.data);
    })
}

async function getListDrawing() {
    let res = await fetch(ip_gis + 'gis/draw_layer_list').then(resp => {
        if (!resp.ok)
            throw Error('There is something wrong')
        return resp.json();
    })
    return res;
}

let loaded_draw = [];
let collection = {};
let drewSource = new ol.source.Vector({
    useSpatialIndex: false
});
let drewLayer = new ol.layer.Vector({
    source: drewSource,
    zIndex: 100000
});

let select = new ol.interaction.Select({
    layers: [drewLayer]
});

select.on('select', function (evt) {
    let latlong = evt.mapBrowserEvent.coordinate;
    let feat = evt.selected[0];

    if (feat) {
        let id = feat.getId();
        let info = '';
        if (id) {
            // let loadedDetails = false;
            get_feature_details(id).then(function (response) {
                if (response.status !== 'OK') {
                    console.log('error')
                }
                // loadedDetails = true;
                info = response.data;

                let body = document.getElementById('popup-tbody')

                let html = '<tr>' +
                    '                    <td style="text-transform: capitalize">' + info[0].column + '</td>' +
                    '                    <td>' + info[0].value + '</td>' +
                    '                </tr>' +
                    '                <tr>' +
                    '                    <td style="text-transform: capitalize">' + info[1].column + '</td>' +
                    '                    <td>' + info[1].value + '</td>' +
                    '                </tr>' +
                    '                <tr>' +
                    '                    <td style="text-transform: capitalize">' + info[2].column + '</td>' +
                    '                    <td>' + info[2].value + '</td>' +
                    '                </tr>' +
                    '                <tr>' +
                    '                    <td style="text-transform: capitalize">' + info[3].column + '</td>' +
                    '                    <td>' +
                    '                        <div class="checkbox" style="margin-bottom:unset;margin-top:5px">' +
                    '                            <label>';
                if (info[3].value)
                    html += '                                <input type="checkbox" checked disabled>';
                else
                    html += '                                <input type="checkbox" disabled>';

                html += '                                <span>Enable</span>' +
                    '                            </label>' +
                    '                        </div>' +
                    '                    </td>' +
                    '                </tr>' +
                    '                <tr>' +
                    '                    <td style="text-transform: capitalize">' + info[4].column + '</td>' +
                    '                    <td>';

                Object.keys(info[4].value).forEach(i => {
                    html += '                    <div class="checkbox" style="margin-bottom:unset">' +
                        '                            <label>';

                    if (info[4].value[i] === 'Yes')
                        html += '                                <input type="checkbox" checked disabled>';
                    else
                        html += '                                <input type="checkbox" disabled>';

                    html += '                                <span>' + i + '</span>' +
                        '                            </label>' +
                        '                        </div>';
                })

                html += '                    </td>' +
                    '                </tr>'

                body.innerHTML = html;

                document.getElementById('popup-closer').addEventListener('click', () => {
                    var markerLayer = map.getOverlayById('popupOverlay');
                    markerLayer.setPosition(undefined);
                    document.getElementById('popup').style.display = 'none';
                })

            });
        }

        var markerLayer = map.getOverlayById('popupOverlay');
        markerLayer.setPosition(latlong);
        document.getElementById('popup').style.display = 'block';

    }

})

async function get_feature_details(id) {
    let res = await fetch(ip_gis + 'gis/get_feature_details?id=' + id).then(function (response) {
        if (!response.ok) {
            throw Error('There is an error');
        }
        return response.json()
    })
    return res
}

map.addInteraction(select);

map.addLayer(drewLayer);

function refreshDrawingList(data) {
    let html = '';
    data.forEach((val, idx) => {
        html += '<tr>' +
            '<td>' +
            '<div class="custom-checkbox custom-control">' +
            '<input type="checkbox" id="' + val.id + '" value="' + val.id + '" class="custom-control-input"><label class="custom-control-label" for="' + val.id + '"></label>' +
            '</div>' +
            '</td>' +
            '<td>' + val.name + '</td>' +
            '<td>' +
            '<button class="btn btn-icon btn-success mr-2" title="Modify Features">' +
            '<i class="lnr-map"></i>' +
            '</button>' +
            '<button class="btn btn-icon btn-primary mr-2" title="Edit Details">' +
            '<i class="lnr-pencil"></i>' +
            '</button>' +
            '<button class="btn btn-icon btn-danger mr-2" title="Delete">' +
            '<i class="lnr-trash"></i>' +
            '</button>' +
            '</td>' +
            '</tr>';
    })

    drawList.innerHTML = html;

    $('tbody[id="listDrawing"]  > tr > td > div > input[type="checkbox"]').change(e => {
        let id = e.target.id;
        let get_check = $('#' + id).prop('checked');
        fetch(ip_gis + 'gis/get_draw_features?id=' + id).then(resp => {
            if (!resp.ok)
                throw Error('There is something wrong')
            return resp.json()
        }).then(result => {
            collection[id] = new ol.Collection();
            result.data.forEach((val, idx) => {
                if (val['type'] === 'Polygon') {
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Polygon(val['coordinates']['data'])
                    });
                } else if (val['type'] === 'LineString') {
                    var feature = new ol.Feature({
                        geometry: new ol.geom.LineString(val['coordinates']['data'])
                    });
                } else if (val['type'] === 'Point') {
                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(val['coordinates']['data'])
                    });
                }

                feature.setId(val['id']);

                collection[id].push(feature);
            });

            if (get_check) {
                drewSource.addFeatures(collection[id].getArray());
                loaded_draw.push(id);
            } else {
                // newSource.getFeaturesCollection();

                collection[id].getArray().forEach(function (feat) {
                    let l = drewSource.getFeatureById(feat.getId());
                    drewSource.removeFeature(l);

                    let features = select.getFeatures();

                    if (features.a.length > 0) {

                        let idx = features.a.findIndex(item => item.getId() === l.getId());
                        if (idx > -1) {
                            select.getFeatures().removeAt(idx);
                            // $scope.closePopupEditable();
                        }
                    }


                });
                let idx = loaded_draw.findIndex(item => item === id);
                loaded_draw.splice(idx, 1);

                var index = data.findIndex(item => item.id === id);

                // map.removeInteraction(data[index].modify);

                data[index].modify = false;

                delete collection[id];


            }

        })
    });

    $('tbody[id="listDrawing"] > tr > td > button[title="Delete"]').click((e) => {
        let target = e.currentTarget;
        let id = $(target).parents()[1].children[0].children[0].children[0].id;

        createModal();
        $('#gisModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Delete Confirmation';
        $('#gisModalOk')[0].innerText = 'Yes';

        let html = 'Are you sure you want to delete the selected item?'

        $('#gisModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

        $('#gisModalCancel').click((e) => {
            $('#gisModal').remove();
        })

        $('#gisModalOk').click((e) => {
            let config = {
                method: 'DELETE'
            }
            fetch(ip_gis + 'gis/delete_draw/' + id, config).then(resp => {
                if (!resp.ok)
                    throw Error('There is something wrong')
                return resp.json()
            }).then(result => {
                if (result.status !== 'OK')
                    console.log('error')
                else {
                    $('#gisModal').remove();
                    loadDrawing();

                    Toastify({
                        text: "Successfully deleted drawn layer",
                        backgroundColor: "#3ac47d",
                    }).showToast();
                }
            });
        })

    });

    $('tbody[id="listDrawing"] > tr > td > button[title="Modify Features"]').click((e) => {
        let target = e.currentTarget;
        let id = $(target).parents()[1].children[0].children[0].children[0].id;
        let index = data.findIndex(item => item.id === id);


        if (data[index].modify) {
            map.removeInteraction(data[index].modify);
            data[index].modify = false;
            target.innerHTML = '<i class="lnr-map"></i>'
            modify_drawing(id);
        } else {
            if (collection[id]) {
                var modify = new ol.interaction.Modify({
                    features: collection[id]
                });
                data[index].modify = modify;
                map.addInteraction(modify);
                target.innerHTML = '<i class="lnr-database"></i>'
            } else {
                console.log('Please check the layer to edit');
            }
        }
    });

    $('tbody[id="listDrawing"] > tr > td > button[title="Edit Details"]').click((e) => {
        let target = e.currentTarget;
        let id = $(target).parents()[1].children[0].children[0].children[0].id;

        createModal();
        $('#gisModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Edit Virtual Fence';
        $('#gisModalOk')[0].innerText = 'Edit';

        fetch(ip_gis + 'gis/get_draw_details?id=' + id).then(response => {
            if (!response.ok)
                throw Error('There is something wrong')
            return response.json()
        }).then(result => {

            let html = '<form id="form1">' +
                '<div class="form-group">' +
                '<label for="name">Name</label>' +
                '<input type="text" id="name" name="name" value="' + result.name + '" class="form-control" placeholder="Type here" required>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="opstart">Operation Start</label>' +
                '<input type="text" id="opstart" name="operation_start" value="' + result.operation_start + '" class="form-control" placeholder="Type here" required>' +
                '</div>' +
                '<div class="form-group">' +
                '<label for="opstop">Operation Stop</label>' +
                '<input type="text" id="opstop" name="operation_stop" value="' + result.operation_stop + '" class="form-control" placeholder="Type here">' +
                '</div>' +
                '<div class="form-group form-inline">' +
                '<label for="status">Status</label>' +
                '<div class="custom-checkbox custom-control ml-3">' +
                '<input type="checkbox" id="status" name="status" class="custom-control-input">' +
                '<label class="custom-control-label" for="status">Enable</label>' +
                '</div>' +
                '</div>' +
                '<div class="form-group">' +
                '<label>Trigger By</label>' +
                '<div class="custom-checkbox custom-control ml-3">' +
                '<input type="checkbox" id="AIS" name="AIS" value="Yes" class="custom-control-input">' +
                '<label class="custom-control-label" for="AIS">AIS</label>' +
                '</div>' +
                '<div class="custom-checkbox custom-control ml-3">' +
                '<input type="checkbox" id="Bot Tracker" name="Bot Tracker" value="Yes" class="custom-control-input">' +
                '<label class="custom-control-label" for="Bot Tracker">Bot Tracker</label>' +
                '</div>' +
                '<div class="custom-checkbox custom-control ml-3">' +
                '<input type="checkbox" id="UnknownRadar" value="Yes" class="custom-control-input">' +
                '<label class="custom-control-label" for="UnknownRadar">Unknown (Radar)</label>' +
                '</div>' +
                '<div class="custom-checkbox custom-control ml-3">' +
                '<input type="checkbox" id="Target" name="Target" value="Yes" class="custom-control-input">' +
                '<label class="custom-control-label" for="Target">Target</label>' +
                '</div>' +
                '</div>' +
                '</form>';


            $('#gisModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

            $("#opstart").timepicker({
                timeFormat: 'H:i',
                appendTo: document.fullscreenElement ? '#fullscreen' : 'body'
            });

            $("#opstop").timepicker({
                timeFormat: 'H:i',
                appendTo: document.fullscreenElement ? '#fullscreen' : 'body'
            });

            $('#status').attr('checked', result.status);
            $('#AIS').attr('checked', result.trigger_by['AIS'] === "Yes");
            $('#Bot Tracker').attr('checked', result.trigger_by['Bot Tracker'] === "Yes");
            $('#Target').attr('checked', result.trigger_by['Target'] === "Yes");
            $('#UnknownRadar').attr('checked', result.trigger_by['Unknown (Radar)'] === "Yes");
        });

        $('#gisModalCancel').click((e) => {
            $('#gisModal').remove();
        })

        $('#gisModalOk').click((e) => {
            let form = $('#form1');
            let raw = form.serializeArray();
            let details = {
                "name": "",
                "operation_start": "",
                "operation_stop": "",
                "status": false,
                "trigger_by": {"AIS": "No", "Bot Tracker": "No", "Unknown (Radar)": "No", "Target": "No"}
            };

            let trigger_by = ["AIS", "Bot Tracker", "Unknown (Radar)", "Target"];

            raw.forEach(val => {
                if (trigger_by.includes(val.name))
                    details["trigger_by"][val.name] = val.value;
                else if (val.name === 'status' && val.value === 'on')
                    val.value = true;

                details[val.name] = val.value;
            })

            let fd = new FormData
            fd.append('id', id)
            fd.append('layer', JSON.stringify(details));

            let config = {
                body: fd,
                method: 'POST'
            }

            fetch(ip_gis + 'gis/save_drawing', config).then(response => {
                if (!response.ok)
                    throw Error('There is something wrong')
                return response.json()
            }).then(result => {
                if (result.status !== 'OK')
                    console.log('error')
                else {
                    $('#gisModal').remove();
                    loadDrawing();

                    Toastify({
                        text: "Successfully edited drawn layer",
                        backgroundColor: "#3ac47d",
                    }).showToast();
                }
            })
        });
    })


}

loadDrawing()

let drawPanel = document.getElementById('draw-sidepanel')

let drawBtn = document.getElementById('drawBtn')
drawBtn.addEventListener('click', () => {

    if (['none', ''].includes(drawPanel.style.display)) {
        drawPanel.style.display = 'block'
        hidePanel();
        enabled_panel = 'draw';
    } else {
        drawPanel.style.display = 'none'
        enabled_panel = '';
    }
})
map.addControl(new ol.control.Control({element: drawBtn}));

let drawingSource = new ol.source.Vector();
let drawingLayer = new ol.layer.Vector({
    source: drawingSource,
    zIndex: 200000
});

map.addLayer(drawingLayer);

let draw = new ol.interaction.Draw({
    source: drawingSource,
    type: 'Polygon'
});

// draw enable/disable
document.getElementById('drawSwitch').addEventListener('click', () => {
    let elem = document.getElementById('drawSwitchCld1');
    if (elem.classList.contains('switch-off')) {
        elem.classList.remove('switch-off');
        elem.classList.add('switch-on');

        map.addInteraction(draw);
    } else {
        elem.classList.remove('switch-on');
        elem.classList.add('switch-off');

        map.removeInteraction(draw);
    }
})

// save drawing
document.getElementById('saveDrawingBtn').addEventListener('click', () => {
    var data = [];
    drawingSource.getFeatures().forEach(function (feat) {
        var obj = {};
        var geom = feat.getGeometry().constructor.name;
        // console.log(feat.getGeometry().getRadius());
        // console.log(feat.getGeometry().getCenter());
        var geocoord = feat.getGeometry().getCoordinates();

        if (geom === 'C')
            obj['type'] = 'Point';
        else if (geom === 'M')
            obj['type'] = 'LineString';
        else if (geom === 'D')
            obj['type'] = 'Polygon';

        obj['coordinates'] = geocoord;
        // esscom

        data.push(obj)
    });
    saveDrawing(data);
})

function saveDrawing(data) {
    createModal();
    $('#gisModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Add Virtual Fence';
    $('#gisModalOk')[0].innerText = 'Add';

    let html = '<form id="form1">' +
        '<div class="form-group">' +
        '<label for="name">Name</label>' +
        '<input type="text" id="name" name="name" value="" class="form-control" placeholder="Type here" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="opstart">Operation Start</label>' +
        '<input type="text" id="opstart" name="operation_start" value="" class="form-control" placeholder="Type here" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="opstop">Operation Stop</label>' +
        '<input type="text" id="opstop" name="operation_stop" value="" class="form-control" placeholder="Type here">' +
        '</div>' +
        '<div class="form-group form-inline">' +
        '<label for="status">Status</label>' +
        '<div class="custom-checkbox custom-control ml-3">' +
        '<input type="checkbox" id="status" name="status" class="custom-control-input">' +
        '<label class="custom-control-label" for="status">Enable</label>' +
        '</div>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Trigger By</label>' +
        '<div class="custom-checkbox custom-control ml-3">' +
        '<input type="checkbox" id="AIS" name="AIS" value="Yes" class="custom-control-input">' +
        '<label class="custom-control-label" for="AIS">AIS</label>' +
        '</div>' +
        '<div class="custom-checkbox custom-control ml-3">' +
        '<input type="checkbox" id="Bot Tracker" name="Bot Tracker" value="Yes" class="custom-control-input">' +
        '<label class="custom-control-label" for="Bot Tracker">Bot Tracker</label>' +
        '</div>' +
        '<div class="custom-checkbox custom-control ml-3">' +
        '<input type="checkbox" id="UnknownRadar" value="Yes" class="custom-control-input">' +
        '<label class="custom-control-label" for="UnknownRadar">Unknown (Radar)</label>' +
        '</div>' +
        '<div class="custom-checkbox custom-control ml-3">' +
        '<input type="checkbox" id="Target" name="Target" value="Yes" class="custom-control-input">' +
        '<label class="custom-control-label" for="Target">Target</label>' +
        '</div>' +
        '</div>' +
        '</form>';


    $('#gisModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

    $("#opstart").timepicker({
        timeFormat: 'H:i',
        appendTo: document.fullscreenElement ? '#fullscreen' : 'body'
    });

    $("#opstop").timepicker({
        timeFormat: 'H:i',
        appendTo: document.fullscreenElement ? '#fullscreen' : 'body'
    });

    $('#gisModalCancel').click((e) => {
        $('#gisModal').remove();
    })

    $('#gisModalOk').click((e) => {
        let form = $('#form1');
        let raw = form.serializeArray();
        let details = {
            "name": "",
            "operation_start": "",
            "operation_stop": "",
            "status": false,
            "trigger_by": {"AIS": "No", "Bot Tracker": "No", "Unknown (Radar)": "No", "Target": "No"}
        };

        let trigger_by = ["AIS", "Bot Tracker", "Unknown (Radar)", "Target"];

        raw.forEach(val => {
            if (trigger_by.includes(val.name))
                details["trigger_by"][val.name] = val.value;
            else if (val.name === 'status' && val.value === 'on')
                val.value = true;

            details[val.name] = val.value;
        })

        let fd = new FormData
        fd.append('data', JSON.stringify(data))
        fd.append('layer', JSON.stringify(details));

        let config = {
            body: fd,
            method: 'POST'
        }

        fetch(ip_gis + 'gis/save_drawing', config).then(response => {
            if (!response.ok)
                throw Error('There is something wrong')
            return response.json()
        }).then(result => {
            if (result.status !== 'OK')
                console.log('error')
            else {
                $('#gisModal').remove();
                loadDrawing();
                drawingSource.clear();

                Toastify({
                    text: "Successfully saved drawing",
                    backgroundColor: "#3ac47d",
                }).showToast();
            }
        })
    })
}

// modify drawing
function modify_drawing(id) {
    let data = [];
    // get modified geometry
    collection[id].getArray().forEach(function (feat) {
        let l = drewSource.getFeatureById(feat.getId());
        var obj = {};
        var geocoord = l.getGeometry().getCoordinates();
        obj['id'] = feat.getId();
        obj['coordinates'] = geocoord;
        data.push(obj)
    });

    let fd = new FormData
    fd.append('data', JSON.stringify(data))

    let config = {
        body: fd,
        method: 'PUT'
    };

    fetch(ip_gis + 'gis/save_drawing/' + id, config).then(response => {
        if (!response.ok)
            throw Error('There is something wrong')
        return response.json()
    }).then(result => {
        if (result.status !== 'OK')
            console.log('error')
        else {
            Toastify({
                text: "Successfully modified drawn layer",
                backgroundColor: "#3ac47d",
            }).showToast();
        }
    })
}

// clear drawing
document.getElementById('clearDrawingBtn').addEventListener('click', () => {
    drawingSource.clear();
})

// measureBtn panel show/hide
let measurePanel = document.getElementById('measure-sidepanel')

let measureBtn = document.getElementById('measureBtn')
measureBtn.addEventListener('click', () => {

    if (['none', ''].includes(measurePanel.style.display)) {
        measurePanel.style.display = 'block'
        hidePanel();
        enabled_panel = 'measure';
    } else {
        measurePanel.style.display = 'none'
        enabled_panel = '';
    }
})
map.addControl(new ol.control.Control({element: measureBtn}));

// measure enable/disable
let measure;
let sketch;
let helpTooltip;
let helpTooltipElement;
let measureTooltipElement;
let measureTooltip;
let continuePolygonMsg = 'Click to continue drawing the polygon';
let continueLineMsg = 'Click to continue drawing the line';
let continuePointMsg = 'Click to pinpoint location';

let measureVal = {'Length': 'LineString', 'Area': 'Polygon', 'Coordinate': 'Point'};

let listener;

var measureSource = new ol.source.Vector();
var measureLayer = new ol.layer.Vector({
    source: measureSource,
    zIndex: 300000,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: 'rgba(219, 144, 53, 1)',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: 'rgba(219, 144, 53, 1)'
            })
        })
    })
});

map.addLayer(measureLayer);

let drawingStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(219, 144, 53, 1.0)',
        lineDash: [10, 10],
        width: 2
    }),
    image: new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({
            color: 'rgba(219, 144, 53, 1.0)'
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        })
    })
});

function pointerMoveHandler(evt) {
    if (evt.dragging) {
        return;
    }
    /** @type {string} */
    var helpMsg = 'Click to start drawing';

    if (sketch) {
        var geom = (sketch.getGeometry());
        if (geom instanceof ol.geom.Polygon) {
            helpMsg = continuePolygonMsg;
        } else if (geom instanceof ol.geom.LineString) {
            helpMsg = continueLineMsg;
        }
    }

    helpTooltipElement.innerHTML = helpMsg;
    helpTooltip.setPosition(evt.coordinate);

    helpTooltipElement.classList.remove('hidden');

}

function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center'
    });
    // console.log('createMeasureTooltip');
    map.addOverlay(measureTooltip);
}

function createHelpTooltip() {
    if (helpTooltipElement) {
        helpTooltipElement.parentNode.removeChild(helpTooltipElement);
    }
    helpTooltipElement = document.createElement('div');
    helpTooltipElement.className = 'tooltip hidden';
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left'
    });
    console.log('createHelpTooltip');
    map.addOverlay(helpTooltip);
}

createHelpTooltip();
createMeasureTooltip();

function measureStart(evt) {
    // set sketch
    sketch = evt.feature;

    /** @type {ol.Coordinate|undefined} */
    var tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function (evt) {
        var geom = evt.target;
        var output;
        if (geom instanceof ol.geom.Polygon) {
            output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof ol.geom.LineString) {
            output = formatLength(geom);
            tooltipCoord = geom.getLastCoordinate();
        }

        measureTooltipElement.innerHTML = output;
        // console.log('measureStart');
        measureTooltip.setPosition(tooltipCoord);
    });
}

function measureEnd(evt) {

    if (evt.feature.getGeometry().constructor.name === 'C') {
        let latlong = evt.feature.getGeometry().getCoordinates();
        let convert = new ol.proj.transform([latlong[0], latlong[1]], 'EPSG:3857', 'EPSG:4326');
        measureTooltipElement.innerHTML = convert[0].toFixed(6) + ', ' + convert[1].toFixed(6);
        measureTooltip.setPosition(latlong);
    }

    measureTooltipElement.className = 'tooltip tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    // console.log('measureEnd');
    createMeasureTooltip();
    ol.Observable.unByKey(listener);
}

function formatLength(line) {
    var length = ol.Sphere.getLength(line);
    var output;
    if (length > 100) {
        output = (Math.round(length / 1000 * 100) / 100) +
            ' ' + 'km';
    } else {
        output = (Math.round(length * 100) / 100) +
            ' ' + 'm';
    }
    return output;
}

var formatArea = function (polygon) {
    var area = ol.Sphere.getArea(polygon);
    var output;
    if (area > 10000) {
        output = (Math.round(area / 1000000 * 100) / 100) +
            ' ' + 'km<sup>2</sup>';
    } else {
        output = (Math.round(area * 100) / 100) +
            ' ' + 'm<sup>2</sup>';
    }
    return output;
};

let measureType = document.getElementById('measureType')

document.getElementById('measureSwitch').addEventListener('click', () => {
    let elem = document.getElementById('measureSwitchCld1');

    if (elem.classList.contains('switch-off')) {
        elem.classList.remove('switch-off');
        elem.classList.add('switch-on');

        measure = new ol.interaction.Draw({
            source: measureSource,
            type: measureVal[measureType.value],
            style: drawingStyle
        });

        map.addInteraction(measure);

        map.on('pointermove', pointerMoveHandler);

        if (measureVal[measureType.value] !== 'Point')
            measure.on('drawstart', measureStart, this);

        measure.on('drawend', measureEnd, this);
    } else {
        elem.classList.remove('switch-on');
        elem.classList.add('switch-off');

        map.removeInteraction(measure);

        helpTooltip.setPosition(null);
        helpTooltipElement.innerHTML = '';
        helpTooltipElement.className = 'tooltip hidden';

        map.un('pointermove', pointerMoveHandler);
    }

})

measureType.addEventListener('change', changeMeasureType)

function changeMeasureType(e) {
    if (measure) {
        map.removeInteraction(measure);

        measure = new ol.interaction.Draw({
            source: measureSource,
            type: measureVal[e.target.value],
            style: drawingStyle
        });

        map.addInteraction(measure);

        if (measureVal[e.target.value] !== 'Point')
            measure.on('drawstart', measureStart, this);

        measure.on('drawend', measureEnd, this);
    }
}

// clear measurement
document.getElementById('clearMeasureBtn').addEventListener('click', () => {
    while (document.getElementsByClassName('tooltip tooltip-static').length > 0) {
        let elems = document.getElementsByClassName('tooltip tooltip-static');
        for (let i = 0; i < elems.length; i++) {
            elems[i].parentElement.remove();
        }

    }
    measureSource.clear();
})

// locateBtn function
let locateBtn = document.getElementById('locateBtn')
locateBtn.addEventListener('click', () => {
    console.log(presetCenter)

    // console.log(ol.proj.transform(geo.getPosition(), 'EPSG:3857', 'EPSG:4326'));
    map.getView().animate({center: presetCenter, zoom: presetZoom});

})
map.addControl(new ol.control.Control({element: locateBtn}));

// bookmark
let bookmarkBtn = document.getElementById('bookmarkBtn')
let bookmarkPanel = document.getElementById('bookmark-sidepanel')
bookmarkBtn.addEventListener('click', () => {
    if (['none', ''].includes(bookmarkPanel.style.display)) {
        bookmarkPanel.style.display = 'block'
        resultPanel.style.display = 'none'
    } else {
        bookmarkPanel.style.display = 'none'
    }
})
map.addControl(new ol.control.Control({element: bookmarkBtn}));

let bookmarkList = document.getElementById('listBookmark')

function loadBookmark() {
    bookmarkList.innerHTML = '<tr><td colspan="2">List is fetching data...</td></tr>'
    let call = getListBookmark()
    call.then(val => {
        if (val.status !== 'OK') {
            bookmarkList.innerHTML = '<tr><td colspan="2">There is an error while fetching data</td></tr>'
            throw Error('Status returned is not OK')
        }

        refreshBookmarkList(val.data);
    })
}

async function getListBookmark() {
    let res = await fetch(ip_gis + 'gis/get_bookmark').then(resp => {
        if (!resp.ok)
            throw Error('There is something wrong')
        return resp.json();
    })
    return res;
}

function refreshBookmarkList(data) {
    let html = '';
    data.forEach((val, idx) => {
        html += '<tr>' +
            '<td><span style="cursor: pointer" class="ml-3" id="' + val.id + '">' + val.name + '</span></td>' +
            '<td style="text-align: center">' +
            '<button class="btn btn-icon btn-primary mr-2" title="Edit">' +
            '<i class="lnr-pencil"></i>' +
            '</button>' +
            '<button class="btn btn-icon btn-danger mr-2" title="Delete">' +
            '<i class="lnr-trash"></i>' +
            '</button>' +
            '</td>' +
            '</tr>';
    })

    bookmarkList.innerHTML = html;

    $('tbody[id="listBookmark"] > tr > td > span').click((e) => {
        let row = data.find(item => item.id === e.target.id)
        map.getView().animate({center: row.latlong, zoom: row.zoom});
    });

    $('tbody[id="listBookmark"] > tr > td > button[title="Delete"]').click((e) => {
        let id = $(e.currentTarget).parents()[1].children[0].children[0].id;

        let config = {
            method: 'DELETE'
        }

        fetch(ip_gis + 'gis/delete_bookmark/' + id, config).then(function (response) {
            if (!response.ok)
                throw Error('There is something wrong');
            return response.json();
        }).then(result => {
            if (result.status !== 'OK') {
                console.log('error');
            } else {
                loadBookmark();

                Toastify({
                    text: "Successfully deleted bookmark",
                    backgroundColor: "#3ac47d",
                }).showToast();
            }
        })
    });

    $('tbody[id="listBookmark"] > tr > td > button[title="Edit"]').click((e) => {
        let nameElem = $(e.currentTarget).parents()[1].children[0];
        let id = nameElem.children[0].id;
        let target = e.currentTarget;

        if (target.innerHTML === '<i class="lnr-pencil"></i>') {
            target.innerHTML = '<i class="lnr-database"></i>';
            target.title = 'Save';
            nameElem.innerHTML = '<input type="text" id=' + id + ' value="' + nameElem.innerText + '" class="ml-3"/>'
            // nameElem.children[0].addEventListener('input', (e) => {
            //     console.log(e.target.value)
            // })
        } else {
            let fd = new FormData
            fd.append('id', id);
            fd.append('name', nameElem.children[0].value)

            let config = {
                body: fd,
                method: 'POST'
            }

            fetch(ip_gis + 'gis/edit_bookmark', config).then(function (response) {
                if (!response.ok)
                    throw Error('There is something wrong')
                return response.json()
            }).then(result => {
                if (result.status !== 'OK') {
                    console.log('error')
                } else {
                    loadBookmark();

                    Toastify({
                        text: "Successfully edited bookmark",
                        backgroundColor: "#3ac47d",
                    }).showToast();
                }
            })
        }


    });

}

loadBookmark();

document.getElementById('addBookmark').addEventListener('click', () => {

    let latlong = map.getView().getCenter();
    let zoom = map.getView().getZoom();

    let fd = new FormData
    fd.append('latlong', latlong.toString());
    fd.append('zoom', zoom)

    var config = {
        body: fd,
        method: 'POST'
    }

    fetch(ip_gis + 'gis/add_bookmark', config).then(function (response) {
        if (!response.ok)
            throw Error('There is something wrong')
        return response.json()
    }).then(result => {
        if (result.status !== 'OK') {
            console.log('error')
        } else {
            loadBookmark();

            Toastify({
                text: "Successfully added bookmark",
                backgroundColor: "#3ac47d",
            }).showToast();
        }
    })
})

// end of bookmark

function hidePanel() {
    if (enabled_panel !== '') {
        let panel;
        if (enabled_panel === 'basemap')
            panel = document.getElementById('basemap-sidepanel');
        else if (enabled_panel === 'layer')
            panel = document.getElementById('layer-sidepanel');
        else if (enabled_panel === 'draw')
            panel = document.getElementById('draw-sidepanel');
        else if (enabled_panel === 'measure')
            panel = document.getElementById('measure-sidepanel');

        panel.style.display = 'none'
    }
}

// filter panel
let filterPanel = document.getElementById('filter-sidepanel')
document.getElementById('filterLayerBtn').addEventListener('click', () => {
    if (['none', ''].includes(filterPanel.style.display)) {
        filterPanel.style.display = 'block'
    } else {
        filterPanel.style.display = 'none'
    }
})

document.getElementById('filterX').addEventListener('click', () => {
    filterPanel.style.display = 'none'
})

// initialize layer tree
$('#oltree').jstree({
    'core': {
        'check_callback': true,
        'data': [
            {
                "id": 1, "text": "Layer", "state": {"opened": true, "checked": true}, "children": []
            },
            {
                "id": "2", "parent": "#", "type": "", "text": "AIS", "state": {"opened": false, "checked": true}
            },
            {
                "id": "3", "parent": "#", "type": "", "text": "Bot Tracker", "state": {"opened": false, "checked": true}
            },
            {
                "id": "4",
                "parent": "#",
                "type": "",
                "text": "Unknown (Radar)",
                "state": {"opened": false, "checked": true}
            },
            {
                "id": "5", "parent": "#", "type": "", "text": "Target", "state": {"opened": false, "checked": true}
            }
        ]
    },
    'types': {
        'layer': {
            'icon': 'lnr-list'
        },
        'default': {
            'icon': 'lnr-map'
        }
    },
    'plugins': ['types', 'contextmenu', 'dnd', 'checkbox'],
    'contextmenu': {
        'select_node': false,
        'items': function (node) {
            if (['Layer', 'AIS', 'Bot Tracker', 'Unknown (Radar)'].includes(node.text) === false) {

                return {
                    removeLayer: {
                        "label": "Remove Layer",
                        "icon": "lnr-circle-minus",
                        "action": function (obj) {
                            let array = map.getLayers().getArray()
                            let layer = array.find(item => item.get('id') === node.id);
                            map.removeLayer(layer);
                            $('#oltree').jstree().delete_node(node)
                        }
                    }

                };


            }
        }
    },
    'checkbox': {
        'tie_selection': false
    }

}).on('create_node.jstree', (e, data) => {
    let layer = convertLayer(data.node.data);
    layer.set('visible', true);
    map.addLayer(layer);
}).on('model.jstree', (e, data) => {
    layer_ordering()
}).on('check_node.jstree', checkNodeCB)
    .on('uncheck_node.jstree', uncheckNodeCB);

// drag n drop
var oldParent = 0;
var oldPosition = 0;
var selector;
var event = $._data(document, "events");
var totalEvt = event.dnd_start.length;

if (totalEvt === 1) {
    $(document).on('dnd_start.vakata', function (e, data) {
        selector = "li#" + data.data.nodes[0] + ".jstree-node";
        oldParent = $('#oltree').jstree().get_node(data.data.nodes[0]).parent;
        oldPosition = $(selector).index();
    });

    $(document).on('dnd_stop.vakata', function (e, data, event) {
        var t = $(data.event.target);
        var node = data.data.origin.get_node(data.data.nodes[0]);
        if (!t.closest('.jstree').length) {
            if (node.parent === "1") {
                layer_ordering();
            } else {
                $('#oltree').jstree().move_node(node, oldParent, oldPosition);
            }
        }
    });
}

let disabled_nodes = [];

function checkNodeCB(e, data) {
    if (['2', '3', '4', '5'].includes(data.node.id)) {
        toggleSSE(data.node.id, true)
    } else {
        map.getLayers().forEach(function (v, i) {
            if (v.get('id') === data.node.id) {
                v.set('visible', true);
                let index = disabled_nodes.findIndex(item => item === data.node.id);
                disabled_nodes.splice(index, 1);
            } else if (data.node.id === "1") {
                if ($('#oltree').jstree().get_node(v.get('id')))
                    v.set('visible', true);
            }
        });
    }

}

function uncheckNodeCB(e, data) {
    if (['2', '3', '4', '5'].includes(data.node.id)) {
        toggleSSE(data.node.id, false)
    } else {
        map.getLayers().forEach(function (v, i) {
            if (v.get('id') === data.node.id) {
                v.set('visible', false);
                disabled_nodes.push(data.node.id);
            } else if (data.node.id === "1") {
                if ($('#oltree').jstree().get_node(v.get('id')))
                    v.set('visible', false);
            }
        })
    }
}


function layer_ordering() {
    let children = $('#oltree').jstree().get_node('1').children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            let layer = $('#oltree').jstree().get_node(children[i]);

            map.getLayers().forEach(function (v, k) {
                if (v.get('id') === layer.id) {
                    v.setOpacity
                    v.setZIndex((children.length - i) * 10);
                }

                // console.log(v.get('name'), v.get('zIndex'), v.get('opacity'), v.get('radius'), v.get('blur'))

            })

        }
    }

}

$('#addBasemapBtn').click(() => {
    createModal();
    $('#gisModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Add Basemap';
    $('#gisModalOk')[0].innerText = 'Add';

    let html = '<form id="form1">' +
        '<div class="form-group">' +
        '<label for="name">Name</label>' +
        '<input type="text" id="name" name="name" value="" class="form-control" placeholder="Type here" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="type">Type</label>' +
        '<input type="text" id="type" name="type" value="" class="form-control" placeholder="Type here" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="apikey">API Key</label>' +
        '<input type="text" id="apikey" name="apikey" value="" class="form-control" placeholder="Type here">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="imagerySet">ImagerySet</label>' +
        '<input type="text" id="imagerySet" name="imagerySet" value="" class="form-control" placeholder="Type here">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="layer">Layer</label>' +
        '<input type="text" id="layer" name="layer" value="" class="form-control" placeholder="Type here">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="attachment">Map Thumbnail</label>' +
        '<div class="custom-file">' +
        '<input type="file" id="attachment" name="attachment" class="custom-file-input">' +
        '<label class="custom-file-label" for="attachment">Choose image</label>' +
        '</div>' +
        '</form>';


    $('#gisModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

    $('#attachment').change(() => {
        var input = this;
        $('.custom-file-label')[0].innerText = input.files[0].name;
    })

    $('#gisModalCancel').click((e) => {
        $('#gisModal').remove();
    })

    $('#gisModalOk').click((e) => {
        let form = $('#form1');
        let raw = form.serializeArray();
        let data = {};

        raw.forEach(val => {
            data[val.name] = val.value;
        })

        let fd = new FormData
        fd.append('data', JSON.stringify(data))
        fd.append('attachment', $('#attachment')[0].files[0]);


        let config = {
            body: fd,
            method: 'POST'
        }
        console.log(fd);
        fetch(ip_gis + 'gis/add_basemap', config).then(response => {
            if (!response.ok)
                throw Error('There is something wrong')
            return response.json()
        }).then(result => {
            if (result.status !== 'OK')
                console.log('error')
            else {
                $('#gisModal').remove();
                loadBasemap();

                Toastify({
                    text: "Successfully added basemap",
                    backgroundColor: "#3ac47d",
                }).showToast();
            }
        })
    })
});

$('#deleteBasemapBtn').click(() => {
    createModal();
    $('#gisModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Delete Confirmation';
    $('#gisModalOk')[0].innerText = 'Yes';

    let html = 'Are you sure you want to delete the selected item?'

    $('#gisModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

    $('#gisModalCancel').click((e) => {
        $('#gisModal').remove();
    })

    $('#gisModalOk').click((e) => {
        let basemap = $('input[name="basemap"]:checked').val();
        let config = {
            method: 'delete'
        }
        fetch(ip_gis + 'gis/delete_basemap/' + basemap, config).then(response => {
            if (!response.ok)
                throw Error('There is something wrong')
            return response.json()
        }).then(result => {
            if (result.status !== 'OK')
                console.log('error')
            else {
                $('#gisModal').remove();
                loadBasemap();

                Toastify({
                    text: "Successfully deleted basemap",
                    backgroundColor: "#3ac47d",
                }).showToast();
            }
        })

    })
});

$('#addLayerBtn').click(() => {
    createModal();
    $('#gisModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Choose Layer';
    $('#gisModalOk')[0].innerText = 'Apply';

    let html = '<div id="tree1"></div>';

    $('#gisModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

    $('#tree1').jstree({
        'core': {
            'check_callback': true,
            'data': {
                'url': ip_gis + 'gis/get_layers_tree_v2'
            }
        },
        'types': {
            'category': {
                'icon': 'pe-7s-folder'
            },
            'layer': {
                'icon': 'lnr-map'
            },
            'default': {
                'icon': 'lnr-map'
            }
        },
        'plugins': ['types', 'contextmenu', 'checkbox'],
        'contextmenu': {
            'select_node': false,
            'items': function (node) {
                if (node.type === 'layer') {
                    return {
                        editLayer: {
                            "label": "Edit Layer",
                            "icon": "lnr-pencil",
                            "action": function (obj) {
                                let parent;
                                fetch(ip_gis + 'gis/get_layer?id=' + node.id).then(response => {
                                    if (!response.ok)
                                        throw Error('There is something wrong')
                                    return response.json()
                                }).then(result => {
                                    parent = result.category_id;
                                    let html = '<form id="form1">' +
                                        '<div class="form-group">' +
                                        '<label for="name">Name</label>' +
                                        '<input type="text" id="name" value="' + result.name + '" name="name" class="form-control" placeholder="Type here" required>' +
                                        '</div>' +
                                        '<div class="form-group">' +
                                        '<label for="type">Type</label>' +
                                        '<input type="text" id="type" value="' + result.type + '" name="type" class="form-control" placeholder="Type here" required>' +
                                        '</div>' +
                                        '<div class="form-group">' +
                                        '<label for="url">URL</label>' +
                                        '<input type="text" id="url" value="' + result.url + '" name="url" class="form-control" placeholder="Type here" required>' +
                                        '</div>' +
                                        '<div class="form-group">' +
                                        '<label for="imagerySet">ImagerySet</label>' +
                                        '<input type="text" id="imagerySet" value="' + result.imagerySet + '" name="imagerySet" class="form-control" placeholder="Type here">' +
                                        '</div>' +
                                        '<div class="form-group">' +
                                        '<label for="layer">Layer</label>' +
                                        '<input type="text" id="layer" value="' + result.layer + '" name="layer" class="form-control" placeholder="Type here">' +
                                        '</div>' +
                                        '</form>';

                                    $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;
                                }).catch(error => {
                                    console.log(error);
                                    throw Error(error)
                                })

                                createNestedModal();
                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Edit Layer';
                                $('#gisNestedModalOk')[0].innerText = 'Edit';

                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

                                $('#gisNestedModalCancel').click((e) => {
                                    $('#gisNestedModal').remove();
                                })

                                $('#gisNestedModalOk').click((e) => {
                                    let form = $('#form1');
                                    let raw = form.serializeArray();
                                    let item = {};

                                    raw.forEach(val => {
                                        item[val.name] = val.value;
                                    })
                                    item['id'] = node.id;
                                    item['category_id'] = parent;

                                    let data = {
                                        data: item,
                                        uploadfile: false,
                                        parent: null,
                                        id: node.id
                                    }

                                    let fd = new FormData
                                    fd.append('data', JSON.stringify(data))


                                    let config = {
                                        body: fd,
                                        method: 'POST'
                                    }
                                    fetch(ip_gis + 'gis/add_new_layer', config).then(response => {
                                        if (!response.ok)
                                            throw Error('There is something wrong')
                                        return response.json()
                                    }).then(result => {
                                        if (result.status !== 'OK')
                                            console.log('error')
                                        else {
                                            $('#gisNestedModal').remove();
                                            $('#tree1').jstree('refresh');

                                            Toastify({
                                                text: "Successfully edited layer",
                                                backgroundColor: "#3ac47d",
                                            }).showToast();
                                        }
                                    })

                                })
                            }
                        },
                        removeLayer: {
                            "label": "Delete Layer",
                            "icon": "lnr-trash",
                            "action": function (obj) {
                                createNestedModal();
                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Delete Confirmation';
                                $('#gisNestedModalOk')[0].innerText = 'Yes';

                                let html = 'Are you sure you want to delete the selected item?'

                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

                                $('#gisNestedModalCancel').click((e) => {
                                    $('#gisNestedModal').remove();
                                })

                                $('#gisNestedModalOk').click((e) => {

                                    let config = {
                                        method: 'delete'
                                    }
                                    fetch(ip_gis + 'gis/delete_layer/' + node.id, config).then(response => {
                                        if (!response.ok)
                                            throw Error('There is something wrong')
                                        return response.json()
                                    }).then(result => {
                                        if (result.status !== 'OK')
                                            console.log('error')
                                        else {
                                            $('#gisNestedModal').remove();
                                            $('#tree1').jstree('refresh');

                                            Toastify({
                                                text: "Successfully deleted layer",
                                                backgroundColor: "#3ac47d",
                                            }).showToast();
                                        }
                                    })

                                })

                            }
                        }

                    }
                } else if (node.type === 'category') {
                    return {
                        addLayer: {
                            "label": "Add Layer",
                            "icon": "lnr-plus-circle",
                            "action": () => {
                                createNestedModal();
                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Add Layer';
                                $('#gisNestedModalOk')[0].innerText = 'Add';

                                let html = '<form id="form1">' +
                                    '<div class="form-group">' +
                                    '<label for="name">Name</label>' +
                                    '<input type="text" id="name" value="" name="name" class="form-control" placeholder="Type here" required>' +
                                    '</div>' +
                                    '<div class="form-group">' +
                                    '<label for="type">Type</label>' +
                                    '<input type="text" id="type" value="" name="type" class="form-control" placeholder="Type here" required>' +
                                    '</div>' +
                                    '<div class="form-group">' +
                                    '<label for="url">URL</label>' +
                                    '<input type="text" id="url" value="" name="url" class="form-control" placeholder="Type here" required>' +
                                    '</div>' +
                                    '<div class="form-group">' +
                                    '<label for="imagerySet">ImagerySet</label>' +
                                    '<input type="text" id="imagerySet" value="" name="imagerySet" class="form-control" placeholder="Type here">' +
                                    '</div>' +
                                    '<div class="form-group">' +
                                    '<label for="layer">Layer</label>' +
                                    '<input type="text" id="layer" value="" name="layer" class="form-control" placeholder="Type here">' +
                                    '</div>' +
                                    '</form>';

                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

                                $('#gisNestedModalCancel').click((e) => {
                                    $('#gisNestedModal').remove();
                                })

                                $('#gisNestedModalOk').click((e) => {
                                    let form = $('#form1');
                                    let raw = form.serializeArray();
                                    let item = {};

                                    raw.forEach(val => {
                                        item[val.name] = val.value;
                                    })

                                    let data = {
                                        data: item,
                                        parent: node.id,
                                        uploadfile: false
                                    }

                                    let fd = new FormData
                                    fd.append('data', JSON.stringify(data))


                                    let config = {
                                        body: fd,
                                        method: 'POST'
                                    }
                                    fetch(ip_gis + 'gis/add_new_layer', config).then(response => {
                                        if (!response.ok)
                                            throw Error('There is something wrong')
                                        return response.json()
                                    }).then(result => {
                                        if (result.status !== 'OK')
                                            console.log('error')
                                        else {
                                            $('#gisNestedModal').remove();
                                            $('#tree1').jstree('refresh');

                                            Toastify({
                                                text: "Successfully added layer",
                                                backgroundColor: "#3ac47d",
                                            }).showToast();
                                        }
                                    })

                                })
                            }
                        },
                        editCategory: {
                            "label": "Edit Category",
                            "icon": "lnr-pencil",
                            "action": () => {
                                fetch(ip_gis + 'gis/get_category?id=' + node.id).then(response => {
                                    if (!response.ok)
                                        throw Error('There is something wrong')
                                    return response.json()
                                }).then(result => {

                                    let html = '<form id="form1">' +
                                        '<div class="form-group">' +
                                        '<label for="name">Name</label>' +
                                        '<input type="text" id="name" value="' + result.name + '" name="name" class="form-control" placeholder="Type here" required>' +
                                        '</div>' +
                                        '</form>';

                                    $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;
                                }).catch(error => {
                                    console.log(error);
                                    throw Error(error)
                                })

                                createNestedModal();
                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Edit Category';
                                $('#gisNestedModalOk')[0].innerText = 'Edit';

                                $('#gisNestedModalCancel').click((e) => {
                                    $('#gisNestedModal').remove();
                                })

                                $('#gisNestedModalOk').click((e) => {
                                    let form = $('#form1');
                                    let raw = form.serializeArray();
                                    let data = {};

                                    raw.forEach(val => {
                                        data[val.name] = val.value;
                                    })
                                    data['id'] = node.id;

                                    let fd = new FormData
                                    fd.append('data', JSON.stringify(data))

                                    let config = {
                                        body: fd,
                                        method: 'POST'
                                    }
                                    fetch(ip_gis + 'gis/add_category', config).then(response => {
                                        if (!response.ok)
                                            throw Error('There is something wrong')
                                        return response.json()
                                    }).then(result => {
                                        if (result.status !== 'OK')
                                            console.log('error')
                                        else {
                                            $('#gisNestedModal').remove();
                                            $('#tree1').jstree('refresh');

                                            Toastify({
                                                text: "Successfully added category",
                                                backgroundColor: "#3ac47d",
                                            }).showToast();
                                        }
                                    })

                                })
                            }
                        },
                        removeCategory: {
                            "label": "Delete Category",
                            "icon": "lnr-trash",
                            "action": function (obj) {
                                createNestedModal();
                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Delete Confirmation';
                                $('#gisNestedModalOk')[0].innerText = 'Yes';

                                let html = 'Are you sure you want to delete the selected item?'

                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

                                $('#gisNestedModalCancel').click((e) => {
                                    $('#gisNestedModal').remove();
                                })

                                $('#gisNestedModalOk').click((e) => {

                                    let config = {
                                        method: 'delete'
                                    }
                                    fetch(ip_gis + 'gis/delete_category/' + node.id, config).then(response => {
                                        if (!response.ok)
                                            throw Error('There is something wrong')
                                        return response.json()
                                    }).then(result => {
                                        if (result.status !== 'OK')
                                            console.log('error')
                                        else {
                                            $('#gisNestedModal').remove();
                                            $('#tree1').jstree('refresh');

                                            Toastify({
                                                text: "Successfully deleted category",
                                                backgroundColor: "#3ac47d",
                                            }).showToast();
                                        }
                                    })

                                })
                            }
                        }

                    }
                } else {
                    return {
                        addCategory: {
                            "label": "Add Category",
                            "icon": "lnr-plus-circle",
                            "action": () => {
                                createNestedModal();
                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-header .modal-title')[0].innerText = 'Add Category';
                                $('#gisNestedModalOk')[0].innerText = 'Add';

                                let html = '<form id="form1">' +
                                    '<div class="form-group">' +
                                    '<label for="name">Name</label>' +
                                    '<input type="text" id="name" value="" name="name" class="form-control" placeholder="Type here" required>' +
                                    '</div>' +
                                    '</form>';

                                $('#gisNestedModal .modal .modal-dialog .modal-content .modal-body')[0].innerHTML = html;

                                $('#gisNestedModalCancel').click((e) => {
                                    $('#gisNestedModal').remove();
                                })

                                $('#gisNestedModalOk').click((e) => {
                                    let form = $('#form1');
                                    let raw = form.serializeArray();
                                    let data = {};

                                    raw.forEach(val => {
                                        data[val.name] = val.value;
                                    })

                                    let fd = new FormData
                                    fd.append('data', JSON.stringify(data))

                                    let config = {
                                        body: fd,
                                        method: 'POST'
                                    }
                                    fetch(ip_gis + 'gis/add_category', config).then(response => {
                                        if (!response.ok)
                                            throw Error('There is something wrong')
                                        return response.json()
                                    }).then(result => {
                                        if (result.status !== 'OK')
                                            console.log('error')
                                        else {
                                            $('#gisNestedModal').remove();
                                            $('#tree1').jstree('refresh');

                                            Toastify({
                                                text: "Successfully edited category",
                                                backgroundColor: "#3ac47d",
                                            }).showToast();
                                        }
                                    })

                                })
                            }
                        }
                    }
                }
            }
        },
        'checkbox': {
            'tie_selection': false
        }
    })

    $('#gisModalCancel').click((e) => {
        $('#gisModal').remove();
    })

    $('#gisModalOk').click((e) => {
        let nodes_selected = $('#tree1').jstree("get_checked", true);

        let layers_only = nodes_selected.filter((v) => {
            return v.type === 'layer'
        })

        let oltree = $('#oltree').jstree();

        layers_only.forEach(node => {
            if (!(oltree.get_node(node.id)))
                $('#oltree').jstree().create_node(1, node, 'last');
        })

        $('#gisModal').remove();
    })
});

let div_geocode = document.getElementById('div_geocode');
let input_geocode = document.getElementById('input_geocode');
input_geocode.addEventListener('input', (e) => {
    closeAutocomplete();

    var div_autocomplete = document.createElement('div');
    div_autocomplete.setAttribute("id", input_geocode.id + " autocomplete-list");
    div_autocomplete.className = "autocomplete-items";

    div_geocode.appendChild(div_autocomplete);

    fetch(ip_gis + 'gis/suggest_geocode?input=' + input_geocode.value).then(resp => {
        if (!resp.ok)
            throw Error('There is something wrong')
        return resp.json();
    }).then(function (response) {
        if (response.status === "OK") {
            response.predictions.forEach(function (v, k) {
                let item = document.createElement("div");
                item.innerHTML = "<strong>" + v.description.substr(0, input_geocode.value.length) + "</strong>";
                item.innerHTML += v.description.substr(input_geocode.value.length);
                /*insert a input field that will hold the current array item's value:*/
                item.innerHTML += "<input type='hidden' value='" + v.description + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                item.addEventListener("click", (e) => {
                    /*insert the value for the autocomplete text field:*/
                    input_geocode.value = this.getElementsByTagName("input")[0].value;
                    /*close the list of autocompleted values,
                    (or any other open lists of autocompleted values:*/
                    closeAutocomplete();
                });
                div_autocomplete.append(item);
            });
        }

    });
});

function closeAutocomplete() {
    var existing = document.getElementById(input_geocode.id + " autocomplete-list");
    if (existing)
        input_geocode.parentNode.removeChild(existing);
}

let btn_geocode = document.getElementById('btn_geocode')
btn_geocode.addEventListener('click', geocode);

let resultPanel = document.getElementById('result-sidepanel')

function geocode() {
    let apikey = 'AIzaSyBfjC_1TSAaVjRHmkOgElSnfJLXDmPVnos';
    fetch('https://maps.googleapis.com/maps/api/geocode/json?key=' + apikey + '&address=' + input_geocode.value + '&components=country:my').then(response => {
        if (!response.ok)
            throw Error('There is something wrong')
        return response.json();
    }).then(result => {
        if (result.status === "OK") {
            let html = '<div>' +
                '<h6>Address</h6>' +
                '<p>' + result.results[0].formatted_address + '</p>' +
                '<h6>Latlong</h6>' +
                '<p>' + result.results[0].geometry.location.lng + ', ' + result.results[0].geometry.location.lat + '</p>' +
                '</div>';


            resultPanel.children[1].innerHTML = html;

            let latlong = ol.proj.transform([result.results[0].geometry.location.lng, result.results[0].geometry.location.lat], 'EPSG:4326', 'EPSG:3857')
            map.getView().animate({center: latlong, zoom: 15});

            if (['', 'none'].includes(resultPanel.style.display)) {
                resultPanel.style.display = 'block';
                bookmarkPanel.style.display = 'none';
            }
        } else {
            console.log('error')
        }
    });
}

document.getElementById('searchX').addEventListener('click', () => {
    resultPanel.style.display = 'none'
})


map.addControl(new ol.control.Control({element: div_geocode}));

map.on('pointermove', (evt, data) => {
    if (data) {
        if (data.event.dragging) {
            return;
        }
        var pixel = map.getEventPixel(data.event.originalEvent);
        var hit = map.forEachFeatureAtPixel(pixel, function () {
            return true;
        });
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    }
})


map.on('singleclick', (evt) => {
    document.getElementById('popup').style.display = 'none';

    map.forEachFeatureAtPixel(evt.pixel, function (feature) {

        if (!drewSource.getFeatureById(feature.getId())) {
            let latlong = feature.getGeometry().getCoordinates();
            let convert = ol.proj.transform([latlong[0], latlong[1]], 'EPSG:3857', 'EPSG:4326');
            let info = {
                '0': {'column': 'ID', 'value': feature.getId()},
                '1': {'column': 'Latlong', 'value': convert.toString()},
                '2': {'column': 'Time', 'value': feature.get('time')},
                '3': {'column': 'Sensor', 'value': feature.get('sensor')},
                '4': {'column': 'Status', 'value': feature.get('status')},
                '5': {'column': 'Intersect Border', 'value': feature.get('intersect_border')}
            };

            let html = ''

            Object.keys(info).forEach(v => {
                html += '<tr>' +
                    '<td>' + info[v].column + '</td>' +
                    '<td>' + info[v].value + '</td>' +
                    '</tr>';
            })

            let body = document.getElementById('popup-tbody')

            body.innerHTML = html;

            var markerLayer = map.getOverlayById('popupOverlay');
            markerLayer.setPosition(latlong);
            document.getElementById('popup').style.display = 'block';

        }
    });

})


// esscom sensors layer

var aisSource = new ol.source.Vector();
var aisLayer = new ol.layer.Vector({
    source: aisSource,
    zIndex: 500000
});

var botTrackerSource = new ol.source.Vector();
var botTrackerLayer = new ol.layer.Vector({
    source: botTrackerSource,
    zIndex: 500000
});

var radarSource = new ol.source.Vector();
var radarLayer = new ol.layer.Vector({
    source: radarSource,
    zIndex: 500000
});

var targetSource = new ol.source.Vector();
var targetLayer = new ol.layer.Vector({
    source: targetSource,
    zIndex: 500000
});

var shipImg = {
    'Inside': '/Raw/img/shipInside.png',
    'Outside': '/Raw/img/shipOutside.png'
};

var radarImg = {
    'Inside': '/Raw/img/radarInside.png',
    'Outside': '/Raw/img/radarOutside.png'
};

var audio = new Audio('/Raw/audio/sound.mp3');
audio.load();

// ais sse

map.addLayer(aisLayer);

var aissse = new EventSource(ip_gis + 'gis/consume/AIS');
aissse.onmessage = function (e) {

    let parsed = JSON.parse(e.data);
    if (Array.isArray(parsed)) {
        parsed.forEach(function (v) {

            if (v.hasOwnProperty('id')) {
                let loadedFeat = aisSource.getFeatureById(v.id);
                if (loadedFeat) {
                    aisSource.removeFeature(loadedFeat);
                }

                let convert = ol.proj.transform([v.latlong[0], v.latlong[1]], 'EPSG:4326', 'EPSG:3857');

                let ship = new ol.Feature({
                    geometry: new ol.geom.Point(convert)
                });
                ship.setId(v.id);
                ship.set('time', v.time);
                ship.set('sensor', v.sensor);
                ship.set('status', v.status);
                ship.set('intersect_border', v.intersect_border);
                let style = new ol.style.Style({
                    image: new ol.style.Icon({
                        src: shipImg[v.status]
                    })

                });
                ship.setStyle(style);
                aisSource.addFeature(ship);

                if (v.status === 'Inside' && audio.paused)
                    audio.play()

            }
        })
    }
};

// bot tracker sse

map.addLayer(botTrackerLayer);

var btsse = new EventSource(ip_gis + 'gis/consume/Bot Tracker');
btsse.onmessage = function (e) {

    let parsed = JSON.parse(e.data);
    if (Array.isArray(parsed)) {
        parsed.forEach(function (v) {

            if (v.hasOwnProperty('id')) {
                let loadedFeat = botTrackerSource.getFeatureById(v.id);
                if (loadedFeat) {
                    botTrackerSource.removeFeature(loadedFeat);
                }

                let convert = ol.proj.transform([v.latlong[0], v.latlong[1]], 'EPSG:4326', 'EPSG:3857');

                let ship = new ol.Feature({
                    geometry: new ol.geom.Point(convert)
                });
                ship.setId(v.id);
                ship.set('time', v.time);
                ship.set('sensor', v.sensor);
                ship.set('status', v.status);
                ship.set('intersect_border', v.intersect_border);
                let style = new ol.style.Style({
                    image: new ol.style.Icon({
                        src: shipImg[v.status]
                    })
                });
                ship.setStyle(style);
                botTrackerSource.addFeature(ship);

                if (v.status === 'Inside' && audio.paused)
                    audio.play()
            }
        })
    }
};

// radar sse

map.addLayer(radarLayer);

var radarsse = new EventSource(ip_gis + 'gis/consume/Unknown (Radar)');
radarsse.onmessage = function (e) {

    let parsed = JSON.parse(e.data);
    if (Array.isArray(parsed)) {
        parsed.forEach(function (v) {

            if (v.hasOwnProperty('id')) {
                let loadedFeat = radarSource.getFeatureById(v.id);
                if (loadedFeat) {
                    radarSource.removeFeature(loadedFeat);
                }

                let convert = ol.proj.transform([v.latlong[0], v.latlong[1]], 'EPSG:4326', 'EPSG:3857');

                let ship = new ol.Feature({
                    geometry: new ol.geom.Point(convert)
                });
                ship.setId(v.id);
                ship.set('time', v.time);
                ship.set('sensor', v.sensor);
                ship.set('status', v.status);
                ship.set('intersect_border', v.intersect_border);
                let style = new ol.style.Style({
                    image: new ol.style.Icon({
                        src: radarImg[v.status]
                    })
                });
                ship.setStyle(style);
                radarSource.addFeature(ship);

                if (v.status === 'Inside' && audio.paused)
                    audio.play()
            }
        })
    }
};

// target sse

map.addLayer(targetLayer);

var targetsse = new EventSource(ip_gis + 'gis/consume/Target');
targetsse.onmessage = function (e) {

    let parsed = JSON.parse(e.data);
    if (Array.isArray(parsed)) {
        parsed.forEach(function (v) {

            if (v.hasOwnProperty('id')) {
                let loadedFeat = targetSource.getFeatureById(v.id);
                if (loadedFeat) {
                    targetSource.removeFeature(loadedFeat);
                }

                let convert = ol.proj.transform([v.latlong[0], v.latlong[1]], 'EPSG:4326', 'EPSG:3857');

                let ship = new ol.Feature({
                    geometry: new ol.geom.Point(convert)
                });
                ship.setId(v.id);
                ship.set('time', v.time);
                ship.set('sensor', v.sensor);
                ship.set('status', v.status);
                ship.set('intersect_border', v.intersect_border);
                let style = new ol.style.Style({
                    image: new ol.style.Icon({
                        src: shipImg[v.status]
                    })
                });
                ship.setStyle(style);
                targetSource.addFeature(ship);

                if (v.status === 'Inside' && audio.paused)
                    audio.play()

            }
        })
    }
};

// misc function

function createModal() {
    let modal = document.createElement('div')
    modal.id = 'gisModal';
    modal.tabIndex = -1
    modal.style.position = 'relative';
    modal.style.zIndex = 1050;
    modal.style.display = 'block'
    modal.innerHTML = '<div class="">' +
        '            <div class="modal fade show" role="dialog" tabindex="-1" style="display: block;">' +
        '                <div class="modal-dialog" role="document">' +
        '                    <div class="modal-content">' +
        '                        <div class="modal-header"><h5 class="modal-title"></h5>' +
        '                            <button type="button" class="close" aria-label="Close" id="modalX"><span aria-hidden="true">×</span>' +
        '                            </button>' +
        '                        </div>' +
        '                        <div class="modal-body"></div>' +
        '                        <div class="modal-footer">' +
        '                            <button type="button" class="btn btn-link" id="gisModalCancel">Cancel</button>' +
        '                            <button type="button" class="btn btn-primary" id="gisModalOk"></button>' +
        '                        </div>' +
        '                    </div>' +
        '                </div>' +
        '            </div>' +
        '            <div class="modal-backdrop fade show"></div>' +
        '        </div>' +
        '    </div>'

    let dom = document.fullscreenElement ? '#fullscreen' : 'body';
    $(dom).append(modal);

    $('#modalX').click(() => {
        $('#gisModal').remove();
    })

}

function createNestedModal() {
    let modal = document.createElement('div')
    modal.id = 'gisNestedModal';
    modal.tabIndex = -1
    modal.style.position = 'relative';
    modal.style.zIndex = 1050;
    modal.style.display = 'block'
    modal.innerHTML = '<div class="">' +
        '            <div class="modal fade show" role="dialog" tabindex="-1" style="display: block;">' +
        '                <div class="modal-dialog" role="document">' +
        '                    <div class="modal-content">' +
        '                        <div class="modal-header"><h5 class="modal-title"></h5>' +
        '                            <button type="button" class="close" aria-label="Close" id="modalNestedX"><span aria-hidden="true">×</span>' +
        '                            </button>' +
        '                        </div>' +
        '                        <div class="modal-body"></div>' +
        '                        <div class="modal-footer">' +
        '                            <button type="button" class="btn btn-link" id="gisNestedModalCancel">Cancel</button>' +
        '                            <button type="button" class="btn btn-primary" id="gisNestedModalOk"></button>' +
        '                        </div>' +
        '                    </div>' +
        '                </div>' +
        '            </div>' +
        '            <div class="modal-backdrop fade show"></div>' +
        '        </div>' +
        '    </div>'

    let dom = document.fullscreenElement ? '#fullscreen' : 'body';
    $(dom).append(modal);

    $('#modalNestedX').click(() => {
        $('#gisNestedModal').remove();
    })

}

function convertLayer(v) {
    let layer;
    switch (v.source.type) {
        case 'OSM':
            layer = new ol.layer.Tile({
                id: v.id,
                name: v.name,
                visible: false,
                source: new ol.source.OSM()
            })
            break;
        case 'BingMaps':
            layer = new ol.layer.Tile({
                id: v.id,
                name: v.name,
                visible: false,
                source: new ol.source.BingMaps({
                    key: v.source.key,
                    imagerySet: v.source.imagerySet,
                })
            })
            break;
        case 'EsriBaseMaps':
            let _urlBase = 'https://services.arcgisonline.com/ArcGIS/rest/services/';
            let _url = _urlBase + v.source.layer + '/MapServer/tile/{z}/{y}/{x}';

            layer = new ol.layer.Tile({
                id: v.id,
                name: v.name,
                visible: false,
                source: new ol.source.XYZ({
                    url: _url,
                })
            });
            break;
        case 'GeoJSON':
            layer = new ol.layer.Vector({
                id: v.id,
                name: v.name,
                visible: false,
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON(),
                    url: v.source.url
                })
            });
            break;
        case 'TileWMS':
            layer = new ol.layer.Tile({
                id: v.id,
                name: v.name,
                visible: false,
                source: new ol.source.TileWMS({
                    url: v.source.url,
                    params: v.source.params
                })
            })
            break;
    }
    return layer;
}

function toggleSSE(id, state) {
    switch (id) {
        case '2':
            aisLayer.setVisible(state);
            break;
        case '3':
            botTrackerLayer.setVisible(state);
            break;
        case '4':
            radarLayer.setVisible(state);
            break;
        case '5':
            targetLayer.setVisible(state);
            break
    }

}
