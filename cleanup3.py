import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    line_num = i + 1
    
    # Remove unused imports
    if 'getQuestionValidation,' in line:
        continue
    if 'type FilterTab,' in line:
        continue
    
    # Remove duplicate PieChart (there are two, we keep the first one on line 27 and remove the one on line 34)
    # The duplicate is probably just "  PieChart,\n"
    if 'PieChart,' in line and i > 30:
        continue

    # Remove the broken syntax block
    if 391 <= line_num <= 402:
        continue
        
    new_lines.append(line)

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Cleanup 3 done")
