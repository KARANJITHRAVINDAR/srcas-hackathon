package com.transparencychain.backend.dto.evidence;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectContextData {
    private UUID projectId;
    private String title;
    private LocalDate startDate;
    private Double registeredLatitude;
    private Double registeredLongitude;
    private String geography;
}
