This begins a multi-step process for planning and documenting the mission and roadmap for the current product.

The FIRST STEP is to confirm the product details by following these instructions:

Collect comprehensive product information from the user:

```bash
# Check if product folder already exists
if [ -d "agent-os/product" ]; then
    echo "Product documentation already exists. Review existing files or start fresh?"
    # List existing product files
    ls -la agent-os/product/
fi
```

Gather from user the following required information:
- **Product Idea**: Core concept and purpose (required)
- **Key Features**: Minimum 3 features with descriptions
- **Target Users**: At least 1 user segment with use cases
- **Tech stack**: Confirmation or info regarding the product's tech stack choices

If any required information is missing, prompt user:
```
Please provide the following to create your product plan:
1. Main idea for the product
2. List of key features (minimum 3)
3. Target users and use cases (minimum 1)
4. Will this product use your usual tech stack choices or deviate in any way?
```


Then WAIT for me to give you specific instructions on how to use the information you've gathered to create the mission and roadmap.

## Display confirmation and next step

Once you've gathered all of the necessary information, output the following message:

```
I have all the info I need to help you plan this product.

NEXT STEP 👉 Run the command, `2-create-mission.md`
```
