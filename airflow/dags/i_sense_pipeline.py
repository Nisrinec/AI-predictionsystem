from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "data_team",
    "depends_on_past": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=2),
}

dag = DAG(
    dag_id="i_sense_pipeline",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule_interval="@hourly",
    catchup=False
)

# 1. FETCH i-SENSE DATA
fetch_isense = BashOperator(
    task_id='fetch_isense_data',
    bash_command="python /opt/airflow/scripts/fetch_isense.py",
    dag=dag
)

run_spark = BashOperator(
    task_id='run_spark_pipeline',
    bash_command="python /opt/airflow/scripts/run_pipeline.py",
    dag=dag
)

fetch_isense >> run_spark