sap.ui.define([
    "sd008test/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/format/NumberFormat",
    'sap/m/p13n/Engine',
	'sap/m/p13n/SelectionController',
	'sap/m/p13n/SortController',
	'sap/m/p13n/GroupController',
	'sap/m/p13n/MetadataHelper',
	'sap/ui/model/Sorter',
	'sap/ui/core/library',
	'sap/m/table/ColumnWidthController'
],
function (Controller, JSONModel, ValueHelpDialog, Filter, FilterOperator, MessageToast, BusyIndicator, NumberFormat, Engine, SelectionController, SortController, GroupController, MetadataHelper, Sorter, CoreLibrary, ColumnWidthController) {
    "use strict";

    return Controller.extend("sd008test.controller.Main", {
        onInit: function () {
            this.getRouter().getRoute("Main").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.setModel(new JSONModel({
                Material: [],  // 배열 형태로 초기화
                Customer: '',  // 단일 값 초기화
                MaterialGroup: '',  // 단일 값 초기화
                ConditionTable : '',
                ConditionValidityDate: new Date().toISOString().slice(0, 10),  // 오늘 날짜로 초기화
                CB : '',
                HB : '',
                JJ : '',
            }), 'searchModel');
            this.setModel(new JSONModel([]),'dataModel');
            this.setModel(new JSONModel([]),'data1Model');
            this._registerForP13n();
        },

        handleValueHelp: function (oEvent) {
            var oInputControl = oEvent.getSource();
            var sId = oInputControl.getId().split("--").pop().replace("InputId", "");
            var sTitle, sEntitySet, bMultiSelect, aColumns;
        
            switch (sId) {
                case "Material":
                    sTitle = "자재 코드 선택";
                    sEntitySet = "/YV_SD008_LJH_2_PG";
                    bMultiSelect = true;
                    aColumns = [
                        { label: "자재 코드", key: "ProductExternalID" },
                        { label: "자재명", key: "ProductName" },
                        { label: "C/B칩브레이커", key: "YY1_MAT_CB_PRD" },
                        { label: "형번", key: "YY1_MAT_HB_PRD" },
                        { label: "재종", key: "YY1_MAT_JJ_PRD" }
                    ];
                    break;
                case "Customer":
                    sTitle = "고객 코드 선택";
                    sEntitySet = "/I_Customer";
                    bMultiSelect = false;
                    aColumns = [
                        { label: "고객 코드", key: "Customer" },
                        { label: "고객명", key: "CustomerName" }
                    ];
                    break;
                case "MaterialGroup":
                    sTitle = "자재 그룹 선택";
                    sEntitySet = "/YV_SD008_LJH_2_PG2";
                    bMultiSelect = false;
                    aColumns = [
                        { label: "자재 그룹", key: "ProductGroup" },
                        { label: "자재 그룹명", key: "ProductGroupName" }
                    ];
                    break;
                case "ConditionTable":
                    sTitle = "조건 테이블 선택";
                    sEntitySet = "/YV_SD008_LJH_2_PG3";
                    bMultiSelect = false;
                    aColumns = [
                        { label: "조건 테이블 코드", key: "ConditionTable" }
                    ];
                    break;
            }
        
            // FilterBar 생성
            var oFilterBar = this.createFilterBar(aColumns, this.onFilterBarSearch.bind(this));  // 함수 이름 변경

            // 새로운 ValueHelpDialog를 생성
            this._oVHD = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
                title: sTitle,
                supportMultiselect: bMultiSelect,
                key: aColumns[0].key,
                descriptionKey: aColumns[1] ? aColumns[1].key : '',
                filterBar: oFilterBar,  // 필터바를 다이얼로그에 추가
                ok: this.onValueHelpOkPress.bind(this, oInputControl, sId),
                cancel: function () {
                    this._oVHD.close();
                }.bind(this),
                afterClose: function () {
                    this._oVHD.destroy();
                }.bind(this)
            });

            this.getView().addDependent(this._oVHD);

            this._oVHD.getTableAsync().then(function (oTable) {
                oTable.setModel(this.getOwnerComponent().getModel());
                oTable.bindRows({
                    path: sEntitySet,
                    events: {
                        dataReceived: function () {
                            this._oVHD.update();
                        }.bind(this)
                    }
                });

                aColumns.forEach(function (column) {
                    oTable.addColumn(new sap.ui.table.Column({
                        label: new sap.m.Label({ text: column.label }),
                        template: new sap.m.Text({ text: "{" + column.key + "}" })
                    }));
                });
            }.bind(this));

            // 필터바의 검색 필드에서 엔터 키를 감지하여 검색 함수 호출
            oFilterBar.getAllFilterItems(true).forEach(function (oFilterItem) {
                var oControl = oFilterBar.determineControlByFilterItem(oFilterItem);
                if (oControl && oControl.attachBrowserEvent) {
                    oControl.attachBrowserEvent("keydown", function (e) {
                        if (e.key === "Enter") {
                            this.onFilterBarSearch();
                        }
                    }.bind(this));
                }
            }.bind(this));

            // 기존 MultiInput의 토큰을 다이얼로그에 설정
            this._oVHD.setTokens(oInputControl.getTokens());
            this._oVHD.open();
        }, 
        
        // 필터바에서 검색 버튼이 클릭되었을 때 또는 엔터 키를 눌렀을 때 호출되는 함수
        onFilterBarSearch: function () {  // 함수 이름 변경
            var oFilterBar = this._oVHD.getFilterBar();
            var aFilters = [];

            oFilterBar.getAllFilterItems(true).forEach(function (oFilterItem) {
                var oControl = oFilterBar.determineControlByFilterItem(oFilterItem);
                var sValue = oControl.getValue();
                var sKey = oFilterItem.getName();

                if (sValue) {
                    aFilters.push(new sap.ui.model.Filter(sKey, sap.ui.model.FilterOperator.Contains, sValue));
                }
            });

            var oTable = this._oVHD.getTable();
            var oBinding = oTable.getBinding("rows");
            oBinding.filter(aFilters);
        },
        
        onValueHelpOkPress: function (oInputControl, sId, oEvent) {
            var aTokens = oEvent.getParameter("tokens");
            oInputControl.setTokens(aTokens);
        
            // searchModel 업데이트
            var aValues = aTokens.map(function (oToken) {
                return oToken.getKey();
            });
        
            if (sId === "Material") {
                this.getModel('searchModel').setProperty("/Material", aValues);
            } else {
                this.getModel('searchModel').setProperty("/" + sId, aValues.length > 0 ? aValues[0] : '');
            }
            // 다이얼로그 닫기
            this._oVHD.close();
        },

        createFilterBar: function (aColumns, searchCallback) {
            var aFilterGroupItems = aColumns.map(function(column) {
                return new sap.ui.comp.filterbar.FilterGroupItem({
                    groupName: "DefaultGroup",
                    groupTitle: "검색 조건",
                    name: column.key,
                    label: column.label,
                    control: new sap.m.Input({
                        placeholder: column.label + "을 입력하세요"
                    })
                });
            });

            return new sap.ui.comp.filterbar.FilterBar({
                advancedMode: true,
                filterBarExpanded: true,
                filterGroupItems: aFilterGroupItems,
                search: searchCallback
            });
        },

        
        onSearch: function () {
            var oTable = this.getView().byId('table');
            var oTreeTable = this.getView().byId('TreeTableBasic');
        
            // 새로운 객체로 searchData를 초기화
            var searchData = Object.assign({}, this.getModel('searchModel').getData());
            console.log(searchData);
        
            // 테이블이 바쁘도록 설정
            oTable.setBusy(true);
            oTreeTable.setBusy(true);
        
            let filterConditions = [];
        
            // 칩브레이커(CB) 값이 있는 경우 필터에 추가
            if (searchData.CB) {
                filterConditions.push(`substringof('${searchData.CB}', YY1_MAT_CB_PRD)`);
            }
        
            // 형번(HB) 값이 있는 경우 필터에 추가
            if (searchData.HB) {
                filterConditions.push(`substringof('${searchData.HB}', YY1_MAT_HB_PRD)`);
            }
        
            // 재종(JJ) 값이 있는 경우 필터에 추가
            if (searchData.JJ) {
                filterConditions.push(`substringof('${searchData.JJ}', YY1_MAT_JJ_PRD)`);
            }
        
            // 필터 쿼리 문자열 생성
            let filterQuery = filterConditions.length > 0 ? `$filter=${filterConditions.join(' or ')}` : '';
            let allProducts = [];
            let skip = 0;
            const top = 5000;
            let hasMoreData = true;
        
            // 모든 데이터를 가져올 때까지 반복적으로 AJAX 요청
            const fetchAllProducts = () => {
                return new Promise((resolve, reject) => {
                    const fetch = () => {
                        $.ajax({
                            url: `/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?${filterQuery}&$select=Product&$top=${top}&$skip=${skip}`,
                            type: 'GET',
                            contentType: 'application/json',
                            dataType: 'json',
                            success: (oData) => {
                                if (oData.d.results.length > 0) {
                                    allProducts = allProducts.concat(oData.d.results);
                                    skip += top;
                                    if (oData.d.results.length < top) {
                                        hasMoreData = false;
                                    }
                                } else {
                                    hasMoreData = false;
                                }
        
                                if (hasMoreData) {
                                    fetch();
                                } else {
                                    console.log('I_Product안의 자재코드 검색값 => ');
                                    console.log(allProducts);
                                    resolve(allProducts);
                                }
                            },
                            error: (err) => {
                                console.log(err);
                                reject(err);
                            },
                        });
                    };
        
                    fetch();
                });
            };
        
            // Material 값이 있는 경우 또는 없는 경우 처리
            if (Array.isArray(searchData.Material) && searchData.Material.length > 0) {
                // Material 값이 있고, 추가 조건이 있는 경우
                if (filterConditions.length > 0) {
                    fetchAllProducts().then((products) => {
                        // 가져온 Product 데이터를 임시 변수에 저장
                        const fetchedMaterials = products.map(product => product.Product.trim());
        
                        // Material 값이 배열인 경우, 배열의 모든 값이 검색된 리스트에 포함되어 있는지 확인
                        const matchedMaterials = searchData.Material.filter(material => fetchedMaterials.includes(material.trim()));
        
                        if (matchedMaterials.length > 0) {
                            // 교집합이 있으면 해당 값만 다음 단계로 진행
                            this._fetchPricingConditionRecords(matchedMaterials, searchData, oTable, oTreeTable);
                        } else {
                            // 교집합이 없으면 사용자에게 알림 후 종료
                            const selectedMaterials = searchData.Material.join(', ');
                            MessageToast.show(`선택된 자재코드: '${selectedMaterials}'는 형번: '${searchData.HB}', 재종: '${searchData.JJ}', C/B칩브레이커: '${searchData.CB}' 에 해당하는 데이터가 없습니다.`);
                            oTable.setBusy(false);
                            oTreeTable.setBusy(false);
                        }
                    }).catch((err) => {
                        console.log(err);
                        oTable.setBusy(false);
                        oTreeTable.setBusy(false);
                    });
                } else {
                    // Material 값만 있는 경우, 그대로 다음 단계로 진행
                    this._fetchPricingConditionRecords(searchData.Material, searchData, oTable, oTreeTable);
                }
            } else {
                // Material 값이 없고, 추가 조건만 있을 경우
                fetchAllProducts().then((products) => {
                    const fetchedMaterials = products.map(product => product.Product.trim());
                    
                    if (fetchedMaterials.length > 0) {
                        this._fetchPricingConditionRecords(fetchedMaterials, searchData, oTable, oTreeTable);
                    } else {
                        MessageToast.show(`형번: '${searchData.HB}', 재종: '${searchData.JJ}', C/B칩브레이커: '${searchData.CB}' 에 해당하는 자재코드는 없습니다.`);
                        oTable.setBusy(false);
                        oTreeTable.setBusy(false);
                    }
                }).catch((err) => {
                    console.log(err);
                    oTable.setBusy(false);
                    oTreeTable.setBusy(false);
                });
            }
        },
         
        
        _fetchPricingConditionRecords: function(materials, searchData, oTable, oTreeTable) {
            var sDate = searchData.ConditionValidityDate; // 20240824 형식의 문자열
            var sFormattedDate = sDate + 'T00:00:00';
        
            const chunkArray = (array, chunkSize) => {
                const result = [];
                for (let i = 0; i < array.length; i += chunkSize) {
                    result.push(array.slice(i, i + chunkSize));
                }
                return result;
            };
        
            const materialsChunks = chunkArray(materials, 100); // 100개씩 청크로 나누기
            let allResults = [];
        
            const fetchDataForChunk = (materialsChunk) => {
                const materialConditions = materialsChunk.map(material => `Material eq '${material}'`).join(' or ');
        
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `/sap/opu/odata/sap/API_SLSPRICINGCONDITIONRECORD_SRV/A_SlsPrcgCndnRecdValidity?$filter=(${materialConditions}) and (ConditionType eq 'ZPPR'`
                        + ` and ConditionValidityStartDate le datetime'${sFormattedDate}'`
                        + ` and ConditionValidityEndDate ge datetime'${sFormattedDate}')`
                        + `&$expand=to_SlsPrcgConditionRecord`
                        + `&$select=Material,ConditionType,to_SlsPrcgConditionRecord/ConditionTable`,
                        type: 'GET',
                        contentType: 'application/json',
                        dataType: 'json',
                        success: (oData) => {
                            allResults = allResults.concat(oData.d.results);
                            resolve();
                        },
                        error: (err) => {
                            reject(err);
                        }
                    });
                });
            };
        
            const fetchAllChunks = async () => {
                for (let chunk of materialsChunks) {
                    await fetchDataForChunk(chunk);
                }
                console.log('I_SlsPrcgCndnRecdValidity에서 유효날짜 조건 레코드 =>');
                console.log(allResults);
                let uniqueMaterials = [];
                allResults.forEach(record => {
                    let trimmedMaterial = record.Material.trim();
                    let conditionTable = record.to_SlsPrcgConditionRecord.ConditionTable;
        
                    // ZPPR 조건인 경우만 처리
                    if (record.ConditionType === "ZPPR") {
                        let exists;
        
                        if (searchData.Customer) {
                            // 고객 코드가 존재하는 경우, Material이 중복되지 않도록 처리
                            exists = uniqueMaterials.some(item =>
                                item.Material.trim() === trimmedMaterial
                            );
                        } else {
                            // 고객 코드가 없는 경우, Material과 ConditionTable 조합을 기준으로 중복 체크
                            exists = uniqueMaterials.some(item =>
                                item.Material.trim() === trimmedMaterial &&
                                item.to_SlsPrcgConditionRecord.ConditionTable === conditionTable
                            );
                        }
        
                        if (!exists) {
                            uniqueMaterials.push(record);  // 객체를 배열에 추가
                        }
                    }
                });
        
                console.log('ZPPR 중복 제거 =>');
                console.log(uniqueMaterials);
        
                // 'materials'는 Product 리스트에 있는 Product 값들입니다.
                let finalMaterials = uniqueMaterials.filter(record =>
                    materials.includes(record.Material.trim())
                );
        
                console.log('유효날짜인 Condition 과 조회 결과의 I_Product 의 교집합 =>');
                console.log(finalMaterials);
        
                var oSubModel = this.getOwnerComponent().getModel('SD008_2');
                let date = new Date(searchData.ConditionValidityDate);
                let utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));  // UTC로 변환
                var finalTreeData = [];
                let combinedData = []; // 데이터를 저장할 배열을 초기화
        
                // 모든 비동기 작업을 수집하여 Promise.all()을 사용
                const promises = finalMaterials.map(materialRecord => {
                    var parameters = {
                        Material: materialRecord.Material,
                        Customer: searchData.Customer,
                        MaterialGroup: searchData.MaterialGroup,
                        ConditionValidityDate: utcDate,
                        ConditionTable: searchData.ConditionTable && searchData.ConditionTable.length > 0 ? searchData.ConditionTable : materialRecord.to_SlsPrcgConditionRecord.ConditionTable
                    };
                    console.log(parameters.ConditionTable);
        
                    return this._getODataCreate(oSubModel, '/SD008_2', parameters).done(function (aGetData) {
                        // ZPPR 값이 0이 아닌 경우에만 combinedData에 추가
                        if (aGetData.ZPPR > 0.00) {
                            combinedData = combinedData.concat(aGetData);
                            let conditions = [];
        
                            conditions.push({
                                Zcond: '정가 / ZPPR',
                                Zcondtable: aGetData.ZPPRTable,
                                Zvalue: aGetData.ZPPR,
                                Zunit: aGetData.ZPPRUnit
                            });
        
                            conditions.push({
                                Zcond: '할인가1 / ZK06',
                                Zcondtable: aGetData.ZK06Table,
                                Zvalue: aGetData.ZK06,
                                Zunit: aGetData.ZK06Unit
                            });
        
                            conditions.push({
                                Zcond: '할인가2 / ZK07',
                                Zcondtable: aGetData.ZK07Table,
                                Zvalue: aGetData.ZK07,
                                Zunit: aGetData.ZK07Unit
                            });
        
                            finalTreeData.push({
                                Material: aGetData.Material,
                                Customer: aGetData.RecievedCustomer && aGetData.CustomerName ? `${aGetData.CustomerName}(${aGetData.RecievedCustomer})` : aGetData.RecievedCustomer,
                                MaterialGroup: aGetData.RecievedMaterialGroup && aGetData.MaterialGroupName ? `${aGetData.MaterialGroupName}(${aGetData.RecievedMaterialGroup})` : aGetData.RecievedMaterialGroup,
                                Zcond: '판매가 / NETPR',
                                Zcondtable: '',
                                Zvalue: aGetData.NETPR,
                                Zunit: aGetData.NETPRUnit,
                                results: conditions
                            });
                        }
                    }.bind(this));
                });
        
                // 모든 비동기 작업이 완료된 후 모델을 설정
                Promise.all(promises).then(() => {
                    console.log(combinedData);
                    this.setModel(new JSONModel(combinedData), 'dataModel');
                    this.setModel(new JSONModel(finalTreeData), 'data1Model');
                    var oModel = this.getView().getModel('data1Model');
                    var oModel1 = this.getView().getModel('data1Model');
                    oModel.refresh(true); // 강제로 모델 새로 고침
                    oModel1.refresh(true); // 강제로 모델 새로 고침
                    oTable.setBusy(false);
                    oTreeTable.setBusy(false);
                }).catch(err => {
                    console.log(err);
                    oTable.setBusy(false);
                    oTreeTable.setBusy(false);
                });
        
                if (finalMaterials.length <= 0) {
                    this.setModel(new JSONModel([]), 'dataModel');
                    this.setModel(new JSONModel([]), 'data1Model');
                    oTable.setBusy(false);
                    oTreeTable.setBusy(false);
                }
            };
        
            fetchAllChunks().catch(err => {
                console.log(err);
                oTable.setBusy(false);
                oTreeTable.setBusy(false);
            });
        },        

        onReset: function () {
            var aMultiInputIds = ['MaterialInputId', 'CustomerInputId', 'MaterialGroupInputId', 'ConditionTableInputId'];

            aMultiInputIds.forEach(function (sId) {
                var oMultiInput = this.getView().byId(sId);
                if (oMultiInput) {
                    oMultiInput.setValue("");
                    oMultiInput.removeAllTokens();
                }
            }.bind(this));

            var oDatePicker = this.getView().byId('DatePickerId');
            if (oDatePicker) {
                var oToday = new Date();
                oDatePicker.setDateValue(oToday);
            }

            this.setModel(new JSONModel({
                Material: [],  // 배열 형태로 초기화
                Customer: '',  // 단일 값 초기화
                MaterialGroup: '',  // 단일 값 초기화
                ConditionTable: '',
                ConditionValidityDate: new Date().toISOString().slice(0, 10),  // 오늘 날짜로 초기화
                CB : '',
                HB : '',
                JJ : '',
            }), 'searchModel');
        },

        onTokenUpdate: function(oEvent) {
            var oMultiInput = oEvent.getSource();  // 이벤트가 발생한 MultiInput
            var sId = oMultiInput.getId().split("--").pop().replace("InputId", "");
            var tokenUpdateType = oEvent.getParameter("type");  // 이벤트 타입 (added 또는 removed)
            var removedTokens = oEvent.getParameter("removedTokens");  // 제거된 토큰들
            var sModelPath;
        
            // MultiInput의 ID에 따라 모델 경로를 설정
            switch (sId) {
                case "Material":
                    sModelPath = "Material";
                    break;
                case "Customer":
                    sModelPath = "Customer";
                    break;
                case "MaterialGroup":
                    sModelPath = "MaterialGroup";
                    break;
                case "ConditionTable":
                    sModelPath = "ConditionTable";
                    break;
            }
        
            console.log(tokenUpdateType)
            console.log(oMultiInput.getId())
            if (tokenUpdateType === "removed" && sModelPath) {
                var oData = this.getModel('searchModel').getData();  // 현재 모델 값 가져오기
                removedTokens.forEach(function(oToken) {
                    var sTokenKey = oToken.getKey();  // 토큰의 키 값
        
                    if (Array.isArray(oData[sId])) {
                        // Material 배열의 경우
                        var iIndex = oData[sId].indexOf(sTokenKey);
                        if (iIndex !== -1) {
                            oData[sId].splice(iIndex, 1);  // 모델의 배열에서 해당 항목 제거
                            console.log('진입2')
                        }
                    } else {
                        // Customer 및 MaterialGroup 문자열의 경우
                        if (oData[sId] === sTokenKey) {
                            oData[sId] = "";  // 문자열을 비움
                        }
                    }
                });
        
                this.setProperty('searchModel', sModelPath, oData[sId]);  // 변경된 데이터를 모델에 반영
            }
        },

        onSelectSuggestionItem: function(oEvent) {
            var oMultiInput = oEvent.getSource();  // 이벤트가 발생한 MultiInput
            var sId = oMultiInput.getId().split("--").pop().replace("InputId", "");
            var oSelectedRow = oEvent.getParameter("selectedRow");  // 선택된 행
            var sModelPath;
            var sTokenKey, sTokenText;
        
            switch (sId) {
                case "Material":
                    sModelPath = "/Material";
                    sTokenKey = oSelectedRow.getCells()[0].getText();  // 자재 코드
                    sTokenText = oSelectedRow.getCells()[1].getText() + " (" + sTokenKey + ")";  // 자재명(자재코드)
                    break;
                case "Customer":
                    sModelPath = "/Customer";
                    sTokenKey = oSelectedRow.getCells()[0].getText();  // 고객 코드
                    sTokenText = oSelectedRow.getCells()[1].getText() + " (" + sTokenKey + ")";  // 고객명(고객코드)
                    break;
                case "MaterialGroup":
                    sModelPath = "/MaterialGroup";
                    sTokenKey = oSelectedRow.getCells()[0].getText();  // 자재 그룹 코드
                    sTokenText = oSelectedRow.getCells()[1].getText() + " (" + sTokenKey + ")";  // 자재 그룹명(자재 그룹 코드)
                    break;
                case "ConditionTable":
                    sModelPath = "/ConditionTable";
                    sTokenKey = oSelectedRow.getCells()[0].getText();  // 조건 테이블 코드
                    sTokenText = sTokenKey;  // 조건 테이블 코드만 표시
                    break;
            }
        
            // 선택된 항목을 토큰으로 추가
            var oToken = new sap.m.Token({
                key: sTokenKey,
                text: sTokenText
            });
            oMultiInput.addToken(oToken);
        
            // searchModel 업데이트
            var oModel = this.getModel('searchModel');
            if (sId === "Material") {
                var aMaterials = oModel.getProperty(sModelPath) || [];
                aMaterials.push(sTokenKey);
                oModel.setProperty(sModelPath, aMaterials);
            } else {
                oModel.setProperty(sModelPath, sTokenKey);
            }
        },

        onSuggest: function(oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var aFilters = [];
            
            if (sTerm) {
                aFilters.push(new sap.ui.model.Filter("ProductExternalID", sap.ui.model.FilterOperator.Contains, sTerm));
            }
        
            var oBinding = oEvent.getSource().getBinding("suggestionRows");
            oBinding.filter(aFilters);
        },

        onRowsUpdated: function(oEvent) {
            var oTreeTable = this.byId("TreeTableBasic"); // 트리 테이블의 ID에 맞게 변경
            var aRows = oTreeTable.getRows();
        
            aRows.forEach(function (oRow) {
                var oContext = oRow.getBindingContext("data1Model");
                var oData = oContext ? oContext.getObject() : null;
        
                if (!oData || !oData.Material) {
                    oRow.addStyleClass("sapUiTableRowHighlight"); // CSS 클래스 추가
                } else {
                    oRow.removeStyleClass("sapUiTableRowHighlight"); // CSS 클래스 제거
                }
            });
        },

        currencyFormatter: function (sValue, sCurrency) {
            if (!sValue) {
                return "";
            }
            // 퍼센트일 경우
            if (sCurrency === "%") {
                var oPercentFormat = NumberFormat.getPercentInstance({
                    style: "percent",
                    maximumFractionDigits: 2
                });
                return oPercentFormat.format(sValue / 100); // 퍼센트 포맷 적용
            }
            // 통화일 경우
            var oCurrencyFormat = NumberFormat.getCurrencyInstance({
                currencyCode: true
            });
            return oCurrencyFormat.format(sValue, sCurrency);
        },

        _registerForP13n: function() {
            const oTable = this.byId("table");
        
            this.oMetadataHelper = new MetadataHelper([
                {
                    key: "material_col",
                    label: "자재",
                    path: "Material"
                },
                {
                    key: "customer_col",
                    label: "고객",
                    path: "RecievedCustomer",
                    formatter: (sCustomerName, sRecievedCustomer) => {
                        return sCustomerName ? `${sCustomerName} (${sRecievedCustomer})` : sRecievedCustomer;
                    }
                },
                {
                    key: "material_group_col",
                    label: "자재 그룹",
                    path: "RecievedMaterialGroup",
                    formatter: (sMaterialGroupName, sRecievedMaterialGroup) => {
                        return sMaterialGroupName ? `${sMaterialGroupName} (${sRecievedMaterialGroup})` : sRecievedMaterialGroup;
                    }
                },
                {
                    key: "zppr_table_col",
                    label: "정가 조건",
                    path: "ZPPRTable"
                },
                {
                    key: "zppr_col",
                    label: "정가",
                    path: "ZPPR"
                },
                {
                    key: "zk06_table_col",
                    label: "할인가1 조건",
                    path: "ZK06Table"
                },
                {
                    key: "zk06_col",
                    label: "할인가1",
                    path: "ZK06"
                },
                {
                    key: "zk07_table_col",
                    label: "할인가2 조건",
                    path: "ZK07Table"
                },
                {
                    key: "zk07_col",
                    label: "할인가2",
                    path: "ZK07"
                },
                {
                    key: "netpr_col",
                    label: "판매가",
                    path: "NETPR"
                }
            ]);

            this._mIntialWidth = {
				"firstName_col": "11rem",
				"lastName_col": "11rem",
				"city_col": "11rem",
				"size_col": "11rem"
			};
        
            Engine.getInstance().register(oTable, {
                helper: this.oMetadataHelper,
                controller: {
                    Columns: new SelectionController({
                        targetAggregation: "columns",
                        control: oTable
                    }),
                    Sorter: new SortController({
                        control: oTable
                    }),
                    Groups: new GroupController({
                        control: oTable
                    }),
                    ColumnWidth: new ColumnWidthController({
                        control: oTable
                    })
                }
            });
        
            Engine.getInstance().attachStateChange(this.handleStateChange.bind(this));
        },
        
        onColumnMove: function(oEvt) {
			const oTable = this.byId("table");
			const oAffectedColumn = oEvt.getParameter("column");
			const iNewPos = oEvt.getParameter("newPos");
			const sKey = this._getKey(oAffectedColumn);
			oEvt.preventDefault();

			Engine.getInstance().retrieveState(oTable).then(function(oState) {

				const oCol = oState.Columns.find(function(oColumn) {
					return oColumn.key === sKey;
				}) || {
					key: sKey
				};
				oCol.position = iNewPos;

				Engine.getInstance().applyState(oTable, {
					Columns: [oCol]
				});
			});
		},

		_getKey: function(oControl) {
			return this.getView().getLocalId(oControl.getId());
		},

        handleStateChange: function(oEvt) {

			const oTable = this.byId("table");
			const oState = oEvt.getParameter("state");

            if(!oState){
                return;
            }

            console.log(oTable.getColumns());
			oTable.getColumns().forEach(function(oColumn) {

				const sKey = this._getKey(oColumn);
				const sColumnWidth = oState.ColumnWidth[sKey];

				oColumn.setWidth(sColumnWidth || this._mIntialWidth[sKey]);

				oColumn.setVisible(false);
				oColumn.setSortOrder(CoreLibrary.SortOrder.None);
			}.bind(this));

            console.log(oState.Columns);
			oState.Columns.forEach(function(oProp, iIndex) {
				const oCol = this.byId(oProp.key);
				oCol.setVisible(true);

				oTable.removeColumn(oCol);
				oTable.insertColumn(oCol, iIndex);
			}.bind(this));

			const aSorter = [];
			oState.Sorter.forEach(function(oSorter) {
				const oColumn = this.byId(oSorter.key);
				/** @deprecated As of version 1.120 */
				oColumn.setSorted(true);
				oColumn.setSortOrder(oSorter.descending ? CoreLibrary.SortOrder.Descending : CoreLibrary.SortOrder.Ascending);
				aSorter.push(new Sorter(this.oMetadataHelper.getProperty(oSorter.key).path, oSorter.descending));
			}.bind(this));
			oTable.getBinding("rows").sort(aSorter);

		},

        onColumnMove: function(oEvt) {
			const oTable = this.byId("table");
			const oAffectedColumn = oEvt.getParameter("column");
			const iNewPos = oEvt.getParameter("newPos");
			const sKey = this._getKey(oAffectedColumn);
			oEvt.preventDefault();

			Engine.getInstance().retrieveState(oTable).then(function(oState) {

				const oCol = oState.Columns.find(function(oColumn) {
					return oColumn.key === sKey;
				}) || {
					key: sKey
				};
				oCol.position = iNewPos;
                console.log(oCol);
				Engine.getInstance().applyState(oTable, {
					Columns: [oCol]
				});
			});
		},

        openPersoDialog: function(oEvt) {
			const oTable = this.byId("table");

			Engine.getInstance().show(oTable, ["Columns", "Sorter"], {
				contentHeight: "35rem",
				contentWidth: "32rem",
				source: oEvt.getSource()
			});
		},

        onColumnHeaderItemPress: function(oEvt) {
			const oTable = this.byId("table");
			const sPanel = oEvt.getSource().getIcon().indexOf("sort") >= 0 ? "Sorter" : "Columns";

			Engine.getInstance().show(oTable, [sPanel], {
				contentHeight: "35rem",
				contentWidth: "32rem",
				source: oTable
			});
		},

        onColumnResize: function(oEvt) {
			const oColumn = oEvt.getParameter("column");
			const sWidth = oEvt.getParameter("width");
			const oTable = this.byId("table");

			const oColumnState = {};
			oColumnState[this._getKey(oColumn)] = sWidth;

			Engine.getInstance().applyState(oTable, {
				ColumnWidth: oColumnState
			});
		}
        
    });
});