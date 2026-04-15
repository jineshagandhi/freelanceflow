package com.freelanceflow.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    @RequestMapping(value = {
        "/auth",
        "/freelancer", "/freelancer/dashboard", "/freelancer/marketplace",
        "/freelancer/projects", "/freelancer/invoices", "/freelancer/clients", "/freelancer/profile",
        "/client", "/client/dashboard", "/client/create-project", "/client/projects",
        "/client/bidding", "/client/payments", "/client/profile"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
