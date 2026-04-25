package com.example.diplom.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping({"/", "/login", "/register", "/{path:[^\\.]*}"})
    public String forward() {
        return "forward:/index.html";
    }
}
