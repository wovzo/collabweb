with open("src/app/dashboard/brand/layout.tsx", "r") as f:
    content = f.read()

content = content.replace("Find Influencers", "Applications")

with open("src/app/dashboard/brand/layout.tsx", "w") as f:
    f.write(content)
