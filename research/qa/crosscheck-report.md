# Cross-check report (independent Python recomputation, full-grid sweep)

grid.json sha256: eff3b4c8a2eb87f3f93cf8797f28d5648ef60bc1860b13a092c7a837d3476558
Grid rows: 7154 (0-48 mo; both sexes; weights 2-20 kg, step 0.25)
Fields compared per row: A, Alo, Ahi, B, C, Clo, Chi, D, Dlo, Dhi, fluid (11 fields)
Values compared: 77420 (expected >= 71540; B is null by design where the weight is outside the WHO weight-for-age range: 1274 rows)
Null-pair (grid=NULL, recomputed=NULL) counts: {"A": 0, "Alo": 0, "Ahi": 0, "B": 1274, "C": 0, "Clo": 0, "Chi": 0, "D": 0, "Dlo": 0, "Dhi": 0, "fluid": 0}
Null mismatches (one side null, other not): 0
Worst relative difference: 0.000000% (boys 0mo 3.25kg Dhi: grid=50.1603 rec=50.1603)
Acceptance (0 failures > 0.5%, 0 null mismatches, count >= expected): PASS

Note: constants are duplicated from the same published sources by design (two independent implementations);
the grid hash above pins exactly which artifact this report validated.
