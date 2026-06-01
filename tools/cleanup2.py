import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix expandedMateria and setExpandedMateria
text = re.sub(r'\s*expandedMateria\s*\n\s*setExpandedMateria\s*\n', '\n', text)

# Fix duplicate PieChart
# Remove the second occurrence of PieChart,
text = re.sub(r'^\s*PieChart,\s*\n', '', text, count=1, flags=re.MULTILINE)

# Remove getTabLabel
text = re.sub(r'\s*const getTabLabel =.*?}\s*', '\n', text, flags=re.DOTALL)

# Remove getFilteredMaterias
text = re.sub(r'\s*const getFilteredMaterias =.*?}\s*', '\n', text, flags=re.DOTALL)

# Remove handleSelectQuestionFromList
text = re.sub(r'\s*const handleSelectQuestionFromList =.*?}\s*', '\n', text, flags=re.DOTALL)

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleanup 2 done")
