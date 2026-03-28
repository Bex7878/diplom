package com.example.diplom.controller;

import com.example.diplom.dto.AnalysisRequest;
import com.example.diplom.dto.ExtractedItem;
import com.example.diplom.model.MarketIndicator;
import com.example.diplom.repository.BenchmarkLogRepository;
import com.example.diplom.repository.ContractRepository;
import com.example.diplom.repository.ExtractedItemRepository;
import com.example.diplom.repository.MarketIndicatorRepository;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class AnalysisControllerIT {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private MarketIndicatorRepository marketIndicatorRepository;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private BenchmarkLogRepository benchmarkLogRepository;

    @Autowired
    private ExtractedItemRepository extractedItemRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        mockServer = MockRestServiceServer.createServer(restTemplate);
        
        benchmarkLogRepository.deleteAll();
        extractedItemRepository.deleteAll();
        contractRepository.deleteAll();
        marketIndicatorRepository.deleteAll();
    }

    @Test
    void testUpdateMarketData() throws Exception {
        mockMvc.perform(post("/api/analysis/market-data")
                .param("itemName", "Laptop")
                .param("price", "1500.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemName", is("Laptop")))
                .andExpect(jsonPath("$.baselinePrice", is(1500.0)));
    }

    @Test
    void testSpotCheckWithRisk() throws Exception {
        // 1. Prepare market data
        marketIndicatorRepository.save(MarketIndicator.builder()
                .itemName("Laptop")
                .baselinePrice(BigDecimal.valueOf(1000.0))
                .build());

        // 2. Mock NLP Service
        ExtractedItem item = new ExtractedItem("Laptop", 1.0, "pcs", 1500.0);
        String nlpResponse = objectMapper.writeValueAsString(List.of(item));

        mockServer.expect(requestTo("http://localhost:8000/extract"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(nlpResponse, MediaType.APPLICATION_JSON));

        // 3. Perform request
        AnalysisRequest request = new AnalysisRequest("I want to buy a laptop for 1500");
        
        mockMvc.perform(post("/api/analysis/spot-check")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .param("bin", "123456789012"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].item.item_name", is("Laptop")))
                .andExpect(jsonPath("$[0].marketPrice", is(1000.0)))
                .andExpect(jsonPath("$[0].deviationPercentage", is(50.0)))
                .andExpect(jsonPath("$[0].isHighRisk", is(true)));

        mockServer.verify();
    }

    @Test
    void testGetHistory() throws Exception {
        // First, create some data via spot-check
        ExtractedItem item = new ExtractedItem("Monitor", 2.0, "pcs", 200.0);
        String nlpResponse = objectMapper.writeValueAsString(List.of(item));

        mockServer.expect(requestTo("http://localhost:8000/extract"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(nlpResponse, MediaType.APPLICATION_JSON));

        AnalysisRequest request = new AnalysisRequest("Buy 2 monitors for 200 each");
        mockMvc.perform(post("/api/analysis/spot-check")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        // Then, get history
        mockMvc.perform(get("/api/analysis/contracts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].extractedItems", hasSize(1)))
                .andExpect(jsonPath("$[0].extractedItems[0].itemName", is("Monitor")));
    }

    @Test
    void testGetRisks() throws Exception {
        // 1. Prepare market data (low price)
        marketIndicatorRepository.save(MarketIndicator.builder()
                .itemName("Mouse")
                .baselinePrice(BigDecimal.valueOf(10.0))
                .build());

        // 2. Mock NLP (high price -> risk)
        ExtractedItem item = new ExtractedItem("Mouse", 1.0, "pcs", 20.0);
        String nlpResponse = objectMapper.writeValueAsString(List.of(item));

        mockServer.expect(requestTo("http://localhost:8000/extract"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(nlpResponse, MediaType.APPLICATION_JSON));

        AnalysisRequest request = new AnalysisRequest("Buy mouse for 20");
        mockMvc.perform(post("/api/analysis/spot-check")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        // 3. Get risks
        mockMvc.perform(get("/api/analysis/risks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].deviationPercentage", is(100.0)));
    }
}
