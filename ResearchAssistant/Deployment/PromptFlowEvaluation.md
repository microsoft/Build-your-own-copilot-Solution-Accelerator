# Setting up an Evaluation Flow in Prompt Flow
<h2>
Evaluation Flow
</h2>

**Evaluation Flow overview**

Evaluation flows are special types of flows that assess how well the outputs of a run align with specific criteria and goals by calculating metrics.

In prompt flow, you can customize or create your own evaluation flow and metrics tailored to your tasks and objectives, and then use it to evaluate other flows



### **How to run Evaluation Flow**

1. Go to AI Studio [AI Studio](https://ai.azure.com/).

   
2.  Locate your AI project under recent projects.
 ![image1](/Deployment/images/evaluation/image1.png)

        
3.  Once inside your project, select Evaluation from the left dropdown menu.
 ![image2](/Deployment/images/evaluation/image2.png)


4. From your Evaluation view, select New evaluation in the middle of the page. 
 ![imag3](/Deployment/images/evaluation/image3.png)

5. From here you can create, name a new evaluation and select your scenario. 
 ![image4](/Deployment/images/evaluation/image4.png)
6. Select the flow you want to evaluate. (To evaluate the DraftFlow select DraftFlow here)
 ![image5](/Deployment/images/evaluation/image5.png)
7. Select metrics you would like to use. Also, be sure to select an active Connection and active Deployment name/Model.
 ![image6](/Deployment/images/evaluation/image6.png)
8. Use an existing dataset or upload a dataset to use in evaluation. (Upload the provided dataset found in \Deployment\data\EvaluationDataset.csv)
 ![image7](/Deployment/images/evaluation/image7.png)

9. Lastly, map the inputs from your dataset and click submit.
 ![image8](/Deployment/images/evaluation/image8.png)


### Results

Once the flow has been ran successfully, the metrics will be displayed showing a 1-5 score of each respective metric. From here, you can click into the evaluation flow to get a better understanding of the scores.
  ![image9](/Deployment/images/evaluation/image9.png)
  ![image10](/Deployment/images/evaluation/image10.png)



