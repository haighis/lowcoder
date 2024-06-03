import {
  uiCompCategoryNames,
  UICompCategory,
  UICompManifest,
  uiCompRegistry,
} from "comps/uiCompRegistry";
import { isEmpty } from "lodash";
import { language, trans } from "i18n";
import {
  CompIconDiv,
  EmptyCompContent,
  RightPanelContentWrapper,
} from "pages/editor/right/styledComponent";
import { tableDragClassName } from "pages/tutorials/tutorialsConstant";
import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  BaseSection,
  PropertySectionContext,
  PropertySectionContextType,
  PropertySectionState,
  labelCss,
  sectionNames,
} from "lowcoder-design";
import { Divider, Flex, Input } from "antd";
import { genRandomKey } from "@lowcoder-ee/comps/utils/idGenerator";
import dsl from "./detail/previewDsl";
import { RootComp } from "@lowcoder-ee/comps/comps/rootComp";
import { NameGenerator, evalAndReduceWithExposing } from "@lowcoder-ee/comps/utils";
import ThemeSettingsSelector from "@lowcoder-ee/components/ThemeSettingsSelector";
import ThemeSettingsCompStyles from "@lowcoder-ee/components/ThemeSettingsCompStyles";
import { JSONObject } from "@lowcoder-ee/util/jsonTypes";
import PreviewApp from "@lowcoder-ee/components/PreviewApp";
import { parseCompType } from "@lowcoder-ee/comps/utils/remote";

const CompDiv = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 64px;
  margin-top: 4px;
`;

const CompNameLabel = styled.div`
  ${labelCss};
  line-height: 15px;
  display: table;
  margin: 3px auto 0;
  color: #333333;
  text-align: center;
  word-break: keep-all;
`;

const CompEnNameLabel = styled.span`
  ${labelCss};
  line-height: 14px;
  font-size: 12px;
  display: table;
  margin: 4px auto auto;
  color: #8b8fa3;
  text-align: center;
  word-spacing: 99px;
`;

const HovDiv = styled.div`
  display: inline-block;
  border-radius: 4px;

  &:hover + ${CompNameLabel} {
    color: #315efb;
  }
`;

const IconContain = (props: { Icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>> }) => {
  const { Icon } = props;
  return (
    <CompIconDiv $w={64} $h={64}>
      <Icon />
    </CompIconDiv>
  );
};
const InsertContain = styled.div`
  width: 224px; /* Adjusted width to fit 3 components in a row */
  display: flex;
  flex-wrap: wrap;
  padding: 4px 0 0 0;
  box-sizing: border-box;
  gap: 8px;
`;

const SectionWrapper = styled.div`
  .section-header {
    margin-left: 0;
  }
  &:not(:last-child){
    border-bottom: 1px solid #e1e3eb;
  }
`;

const stateCompName = 'UICompSections';
const initialState: PropertySectionState = { [stateCompName]: {}};
Object.keys(uiCompCategoryNames).forEach((cat) => {
  const key = uiCompCategoryNames[cat as UICompCategory];
  initialState[stateCompName][key] = key === uiCompCategoryNames.dashboards
})

export const ThemeCompPanel = (props: any) => {
  const { theme } = props;
  const [searchValue, setSearchValue] = useState("");
  const [propertySectionState, setPropertySectionState] = useState<PropertySectionState>(initialState);
  const [searchedPropertySectionState, setSearchedPropertySectionState] = useState<PropertySectionState>({});
  const [styleChildrens, setStyleChildrens] = useState<Record<string, any>>({});
  const [selectedComp, setSelectedComp] = useState<string>('');
  const [appDsl, setAppDSL] = useState<JSONObject>();

  const categories = useMemo(() => {
    const cats: Record<string, [string, UICompManifest][]> = Object.fromEntries(
      Object.keys(uiCompCategoryNames).map((cat) => [cat, []])
    );
    Object.entries(uiCompRegistry).forEach(([name, manifest]) => {
      manifest.categories.forEach((cat) => {
        cats[cat].push([name, manifest]);
      });
    });
    return cats;
  }, []);

  const propertySectionContextValue = useMemo<PropertySectionContextType>(() => {
    const state = searchValue
      ? searchedPropertySectionState
      : propertySectionState;
    const setStateFn = searchValue
      ? setSearchedPropertySectionState
      : setPropertySectionState;

    return {
      compName: stateCompName,
      state,
      toggle: (compName: string, sectionName: string) => {
        setStateFn((oldState) => {
          const nextSectionState: PropertySectionState = { ...oldState };
          const compState = nextSectionState[compName] || {};
          compState[sectionName] = compState[sectionName] === false;
          nextSectionState[compName] = compState;
          return nextSectionState;
        });
      },
    };
  }, [searchValue, propertySectionState, searchedPropertySectionState]);

  useEffect(() => {
    if(!searchValue) {
      setSearchedPropertySectionState({})
    }
  }, [searchValue])

  const onCompSelect = async (compMap: [string, UICompManifest]) => {
    setAppDSL(undefined);
    const [compType, compInfo] = compMap;
    setSelectedComp(compType);
    const compKey = genRandomKey();
    let { comp, defaultDataFn } = compInfo;

    const compData = parseCompType(compType)
    if (compInfo.lazyLoad) {
      comp = (await import(`../../../comps/${compInfo.compPath!}`))[compInfo.compName!];
      const {
        defaultDataFnName,
        defaultDataFnPath,
      } = compInfo;
  
      if(defaultDataFnName && defaultDataFnPath) {
        const module = await import(`../../../comps/${defaultDataFnPath}.tsx`);
        defaultDataFn = module[defaultDataFnName];
      }
      const newComp = new comp!({});
      const compChildrens = newComp.children;
      const styleChildrenKeys = Object.keys(compChildrens).filter(child => child.toLowerCase().endsWith('style'));
      let styleChildrens: Record<string, any> = {};
      styleChildrenKeys.forEach((childKey: string) => {
        styleChildrens[childKey] = compChildrens[childKey];
      })
      setStyleChildrens(styleChildrens);
    } else {
      comp = compInfo.comp;
    }

    const ui = {
      items: {
        [compKey]: {
          compType: compType,
          name: `${compType}1`,
          comp: defaultDataFn
            ? defaultDataFn("comp", new NameGenerator())
            : new comp!({}),
        }
      },
      layout: {
        [compKey]: {
          ...compInfo.layoutInfo,
          w: (compInfo?.layoutInfo?.w || 5) * 1.5,
          h: (compInfo?.layoutInfo?.h || 5),
          i: compKey,
          x: 2,
          y: 2,
        }
      }
    }
    setAppDSL({...dsl as any, ui});
  }

  const compList = useMemo(
    () =>
      Object.entries(categories)
        .map(([key, value], index) => {
          let infos = value;
          if (!isEmpty(searchValue)) {
            const searchString = searchValue.trim().toLocaleLowerCase();
            infos = infos.filter((info) =>
              info[1].keywords.toLowerCase().includes(searchString.toLowerCase())
            );
          }

          if (isEmpty(infos)) {
            return null;
          }

          return (
            <SectionWrapper key={index}>
              <BaseSection 
                style={{ whiteSpace: "normal", overflow: "hidden"}}
                noMargin
                width={210}
                name={uiCompCategoryNames[key as UICompCategory]}
              >
                <InsertContain>
                  {infos.map((info) => (
                    <CompDiv key={info[0]} className={info[0] === "table" ? tableDragClassName : ""} onClick={() => onCompSelect(info)}>
                      <HovDiv>
                        <IconContain Icon={info[1].icon}></IconContain>
                      </HovDiv>
                      <CompNameLabel>{info[1].name}</CompNameLabel>
                      {language !== "en" && <CompEnNameLabel>{info[1].enName}</CompEnNameLabel>}
                    </CompDiv>
                  ))}
                </InsertContain>
              </BaseSection>
            </SectionWrapper>
          );
        })
        .filter((t) => t != null),
    [categories, searchValue]
  );

  const stylePropertyView = useMemo(() => {
    return (
      <>
        {Object.keys(styleChildrens)?.map((styleKey: string) => {
          return (
            <>
              <h4>
                { sectionNames.hasOwnProperty(styleKey)
                  ? sectionNames[styleKey as keyof typeof sectionNames]
                  : styleKey
                }
              </h4>
              <ThemeSettingsCompStyles
                styleOptions={Object.keys(styleChildrens[styleKey].children)}
                defaultStyle={theme.components?.[selectedComp] || {}}
                configChange={(params) => {
                  props.onCompStyleChange(selectedComp, params);
                }}
              />
            </>
          )
        })}
      </>
    )
  }, [styleChildrens]);

  const appPreview = useMemo(() => {
    if (!appDsl) return null;

    return (
      <PreviewApp
        style={{
          height: "500px",
          minWidth: "auto",
          width: "100%",
        }}
        theme={theme}
        dsl={appDsl}
      />
    );
  }, [appDsl, theme]);

  if(!compList.length) return (
    <RightPanelContentWrapper>
      <EmptyCompContent />
    </RightPanelContentWrapper>
  )

  return (
    <Flex style={{
      height: "500px",
      overflow: "hidden",
    }}>
      <RightPanelContentWrapper style={{
        padding: "12px",
        overflow: "auto",
      }}>
        <Input.Search
          placeholder="Search components"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <PropertySectionContext.Provider
          value={propertySectionContextValue}
        >
          {compList}
        </PropertySectionContext.Provider>
      </RightPanelContentWrapper>
      {/* <Divider type="vertical" style={{height: "510px"}}/> */}
      <div style={{flex: "1"}}>
        {appPreview}
      </div>
      {/* <Divider type="vertical" style={{height: "510px"}}/> */}
      <div style={{
        width: "280px",
        padding: "12px",
        overflow: "auto",
      }}>
        {stylePropertyView}
      </div>
    </Flex>
  );
};
