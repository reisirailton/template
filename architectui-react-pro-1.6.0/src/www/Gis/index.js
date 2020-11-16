import React, {Fragment} from 'react';

import ThemeOptions from "../../Layout/ThemeOptions";
import AppHeader from "../../Layout/AppHeader";
import AppSidebar from "../../Layout/AppSidebar";
import {Route} from "react-router-dom";

import AppFooter from "../../Layout/AppFooter";

import GisMain from "./Main/main";

const Gis = ({match}) => (

    <Fragment>
        <ThemeOptions/>
        <AppHeader/>
        <div className="app-main">
            <AppSidebar/>
            <div className="app-main__outer">
                <div className="app-main__inner">

                    <Route path={`${match.url}`} component={GisMain}/>

                </div>
                <AppFooter/>
            </div>
        </div>
    </Fragment>
);


export default Gis
