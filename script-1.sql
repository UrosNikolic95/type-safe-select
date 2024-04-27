update test1_entity 
  set field2 = val.field2,test2_id = val.test2_id
  from (values (1,1,'1'),(1,1,'1'),(1,1,'1'),(1,1,'1')) as val(field2,test2_id,field1)
  where test1_entity.field1 = val.field1